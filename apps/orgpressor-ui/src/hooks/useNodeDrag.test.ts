import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNodeDrag } from "./useNodeDrag";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import { RUBBER_BAND_FACTOR, SNAP_OUT_THRESHOLD } from "../config";

describe("useNodeDrag", () => {
  let mockNetwork: Network;
  let mockNodesDataSet: DataSet<VisNode>;
  let mockEdgesDataSet: DataSet<VisEdge>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventHandlers: Record<string, (...args: any[]) => void>;
  let allEdges: { id: string; from: string; to: string }[];

  const setupHook = () => {
    renderHook(() =>
      useNodeDrag({
        network: mockNetwork,
        nodesDataSet: mockNodesDataSet,
        edgesDataSet: mockEdgesDataSet,
        scale: 1,
      })
    );
  };

  const simulateDrag = (
    nodeId: string,
    startX: number,
    startY: number,
    pointerX: number,
    pointerY: number
  ) => {
    // Update the position for the dragged node while keeping others
    const positions = { ...allPositions, [nodeId]: { x: startX, y: startY } };

    mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
      if (!ids) return positions;
      const result: Record<string, { x: number; y: number }> = {};
      ids.forEach((id) => {
        if (positions[id]) result[id] = positions[id];
      });
      return result;
    });

    eventHandlers["dragStart"]({ nodes: [nodeId] });
    // First dragging event - pointer at node center to establish zero offset
    eventHandlers["dragging"]({
      nodes: [nodeId],
      pointer: { canvas: { x: startX, y: startY } },
    });
    // Second dragging event - actual drag to target position
    eventHandlers["dragging"]({
      nodes: [nodeId],
      pointer: { canvas: { x: pointerX, y: pointerY } },
    });
  };

  const simulateDragEnd = (nodeId: string) => {
    eventHandlers["dragEnd"]({ nodes: [nodeId] });
  };

  const allNodes = [
    { id: "1", label: "Node 1" },
    { id: "2", label: "Node 2" },
    { id: "3", label: "Node 3" },
  ];

  const allPositions: Record<string, { x: number; y: number }> = {
    "1": { x: 100, y: 200 },
    "2": { x: 200, y: 300 },
    "3": { x: 300, y: 300 },
  };

  beforeEach(() => {
    eventHandlers = {};
    // Edge from 1 to 2 means node 2 is a child of node 1
    allEdges = [{ id: "1-2", from: "1", to: "2" }];

    mockNetwork = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        eventHandlers[event] = handler;
      }),
      off: vi.fn(),
      getPositions: vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return allPositions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (allPositions[id]) result[id] = allPositions[id];
        });
        return result;
      }),
      getBoundingBox: vi.fn().mockImplementation((nodeId: string) => {
        // Return bounding box around the node position with ~50px height
        const pos = allPositions[nodeId] || { x: 0, y: 0 };
        return { top: pos.y - 25, left: pos.x - 50, right: pos.x + 50, bottom: pos.y + 25 };
      }),
      canvasToDOM: vi.fn().mockImplementation((pos: { x: number; y: number }) => pos),
      DOMtoCanvas: vi.fn().mockImplementation((pos: { x: number; y: number }) => pos),
      body: {
        container: {
          getBoundingClientRect: vi.fn().mockReturnValue({ top: 0, left: 0, width: 800, height: 600 }),
        },
      },
      destroy: vi.fn(),
    } as unknown as Network;

    mockNodesDataSet = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: vi.fn().mockImplementation((idOrFilter?: string | { filter: (item: any) => boolean }) => {
        if (idOrFilter === undefined) return allNodes;
        if (typeof idOrFilter === "string") {
          return allNodes.find((n) => n.id === idOrFilter) || null;
        }
        return allNodes;
      }),
      update: vi.fn(),
    } as unknown as DataSet<VisNode>;

    mockEdgesDataSet = {
      get: vi.fn().mockImplementation(
        (options?: { filter: (edge: { id: string; from: string; to: string }) => boolean }) => {
          if (options?.filter) {
            return allEdges.filter(options.filter);
          }
          return allEdges;
        }
      ),
      remove: vi.fn(),
    } as unknown as DataSet<VisEdge>;
  });

  describe("nodes with a parent (connected)", () => {
    it("applies rubber band effect when dragged vertically within threshold", () => {
      // Node 2 has a parent (node 1), so it should have rubber band
      setupHook();

      const startY = 300; // Node 2's position
      const dragY = 330; // 30px drag, within threshold
      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: 200, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      // First drag at node position to establish zero pointer offset
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: 200, y: startY } },
      });
      // Actual drag
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: 200, y: dragY } },
      });

      const expectedY = startY + (dragY - startY) * RUBBER_BAND_FACTOR;

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "2",
            x: 200, // X stays at original since this is a vertical drag test
            y: expectedY,
          }),
        ])
      );
    });

    it("snaps back Y but keeps X when drag ends within threshold", () => {
      // Node 2 has a parent (node 1), so it should snap back
      setupHook();

      const startY = 300;
      const startX = 200;
      const dragX = 250;
      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: startX, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      // First drag at node position to establish zero pointer offset
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: startY } },
      });
      // Actual drag
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: dragX, y: 330 } },
      });

      vi.mocked(mockNodesDataSet.update).mockClear();
      mockNetwork.getPositions = vi.fn().mockReturnValue({
        "2": { x: dragX, y: startY + 30 * RUBBER_BAND_FACTOR },
      });

      eventHandlers["dragEnd"]({ nodes: ["2"] });

      // Keeps X position but snaps Y back to original
      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "2",
            x: dragX, // Keeps current X
            y: startY, // Snaps back to original Y
          }),
        ])
      );
    });

    it("disconnects child node from parent when dragged past threshold", () => {
      // Set up: node 2 is a child of node 1
      // When we drag node 2 (the child), it should remove edge "1-2"
      setupHook();

      const startX = 200;
      const startY = 300; // Node 2's Y position
      const dragY = startY + SNAP_OUT_THRESHOLD + 50; // Past threshold

      // Drag node 2 (the child)
      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: startX, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      // First drag at node position to establish zero pointer offset
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: startY } },
      });
      // Actual drag past threshold
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: 250, y: dragY } },
      });

      expect(mockEdgesDataSet.remove).toHaveBeenCalledWith("1-2");
    });

    it("preserves other nodes positions when child disconnects", () => {
      setupHook();

      const startX = 200;
      const startY = 300; // Node 2's Y position
      const dragY = startY + SNAP_OUT_THRESHOLD + 50; // Past threshold

      // Drag node 2 (the child) - it has no descendants
      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: startX, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      // First drag at node position to establish zero pointer offset
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: startY } },
      });
      // Actual drag past threshold
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: 250, y: dragY } },
      });

      // Other nodes (1 and 3) should be restored to their original positions
      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "1", x: 100, y: 200 }),
          expect.objectContaining({ id: "3", x: 300, y: 300 }),
        ])
      );
    });

    it("moves freely (no rubber band) after disconnecting", () => {
      setupHook();

      const startX = 200;
      const startY = 300;
      // Drag node 2 past threshold to disconnect
      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: startX, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      // First drag at node position to establish zero pointer offset
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: startY } },
      });
      // Drag past threshold to disconnect
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: 250, y: startY + SNAP_OUT_THRESHOLD + 50 } },
      });

      vi.mocked(mockNodesDataSet.update).mockClear();

      // Continue dragging - pointer offset is already established (zero)
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: 300, y: 500 } },
      });

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "2",
            x: 300,
            y: 500, // Exact pointer position, no rubber band
          }),
        ])
      );
    });

    it("stays at dropped position after disconnecting (no snap back)", () => {
      setupHook();

      const startX = 200;
      const startY = 300;
      // Drag node 2 past threshold to disconnect
      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: startX, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      // First drag at node position to establish zero pointer offset
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: startY } },
      });
      // Drag past threshold to disconnect
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: 250, y: startY + SNAP_OUT_THRESHOLD + 50 } },
      });

      vi.mocked(mockNodesDataSet.update).mockClear();

      simulateDragEnd("2");

      expect(mockNodesDataSet.update).not.toHaveBeenCalled();
    });

    it("moves subtree together when dragging parent (free movement)", () => {
      // Node 1 has children but no parent, so it moves freely
      // But its children should still move with it
      setupHook();

      const startX = 100;
      const startY = 200;
      const dragX = 150;
      const dragY = 230;
      simulateDrag("1", startX, startY, dragX, dragY);

      // Node 1 moves freely (no rubber band since it has no parent)
      // Child should move with same relative offset
      const childRelativeY = 300 - 200; // Node 2 is 100 below Node 1
      const childRelativeX = 200 - 100; // Node 2 is 100 to the right of Node 1

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "1", x: dragX, y: dragY }), // Free movement
          expect.objectContaining({ id: "2", x: dragX + childRelativeX, y: dragY + childRelativeY }),
        ])
      );
    });
  });

  describe("free nodes (nodes without edges)", () => {
    beforeEach(() => {
      allEdges = [];
      mockEdgesDataSet.get = vi.fn().mockImplementation(() => {
        return []; // No edges
      });
    });

    it("moves freely without rubber band effect", () => {
      setupHook();

      // Node 1 starts at (100, 200), drag to (300, 400)
      simulateDrag("1", 100, 200, 300, 400);

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "1",
            x: 300,
            y: 400, // Exact pointer position
          }),
        ])
      );
    });

    it("stays at dropped position (no snap back)", () => {
      setupHook();

      simulateDrag("1", 100, 200, 300, 400);
      vi.mocked(mockNodesDataSet.update).mockClear();

      simulateDragEnd("1");

      expect(mockNodesDataSet.update).not.toHaveBeenCalled();
    });
  });

  describe("onHierarchyChange callback", () => {
    it("calls onHierarchyChange when node disconnects from parent", () => {
      const onHierarchyChange = vi.fn();

      renderHook(() =>
        useNodeDrag({
          network: mockNetwork,
          nodesDataSet: mockNodesDataSet,
          edgesDataSet: mockEdgesDataSet,
          scale: 1,
          onHierarchyChange,
        })
      );

      const startX = 200;
      const startY = 300; // Node 2's Y position
      const dragY = startY + SNAP_OUT_THRESHOLD + 50; // Past threshold

      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: startX, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: startY } },
      });
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: dragY } },
      });

      expect(onHierarchyChange).toHaveBeenCalledTimes(1);
    });

    it("does not call onHierarchyChange when node stays within threshold", () => {
      const onHierarchyChange = vi.fn();

      renderHook(() =>
        useNodeDrag({
          network: mockNetwork,
          nodesDataSet: mockNodesDataSet,
          edgesDataSet: mockEdgesDataSet,
          scale: 1,
          onHierarchyChange,
        })
      );

      const startX = 200;
      const startY = 300;
      const dragY = startY + 30; // Within threshold

      const positions: Record<string, { x: number; y: number }> = {
        ...allPositions,
        "2": { x: startX, y: startY },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["2"] });
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: startY } },
      });
      eventHandlers["dragging"]({
        nodes: ["2"],
        pointer: { canvas: { x: startX, y: dragY } },
      });
      eventHandlers["dragEnd"]({ nodes: ["2"] });

      expect(onHierarchyChange).not.toHaveBeenCalled();
    });

    it("does not call onHierarchyChange when free node is dragged", () => {
      const onHierarchyChange = vi.fn();
      allEdges = [];
      mockEdgesDataSet.get = vi.fn().mockImplementation(() => []);

      renderHook(() =>
        useNodeDrag({
          network: mockNetwork,
          nodesDataSet: mockNodesDataSet,
          edgesDataSet: mockEdgesDataSet,
          scale: 1,
          onHierarchyChange,
        })
      );

      const positions: Record<string, { x: number; y: number }> = {
        "1": { x: 100, y: 200 },
      };
      mockNetwork.getPositions = vi.fn().mockImplementation((ids?: string[]) => {
        if (!ids) return positions;
        const result: Record<string, { x: number; y: number }> = {};
        ids.forEach((id) => {
          if (positions[id]) result[id] = positions[id];
        });
        return result;
      });

      eventHandlers["dragStart"]({ nodes: ["1"] });
      eventHandlers["dragging"]({
        nodes: ["1"],
        pointer: { canvas: { x: 100, y: 200 } },
      });
      eventHandlers["dragging"]({
        nodes: ["1"],
        pointer: { canvas: { x: 300, y: 400 } },
      });
      eventHandlers["dragEnd"]({ nodes: ["1"] });

      expect(onHierarchyChange).not.toHaveBeenCalled();
    });
  });
});
