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
  let eventHandlers: Record<string, Function>;

  const setupHook = () => {
    renderHook(() =>
      useNodeDrag({
        network: mockNetwork,
        nodesDataSet: mockNodesDataSet,
        edgesDataSet: mockEdgesDataSet,
      })
    );
  };

  const simulateDrag = (
    nodeId: string,
    startY: number,
    pointerX: number,
    pointerY: number
  ) => {
    mockNetwork.getPositions = vi.fn().mockReturnValue({
      [nodeId]: { x: 100, y: startY },
    });

    eventHandlers["dragStart"]({ nodes: [nodeId] });
    eventHandlers["dragging"]({
      nodes: [nodeId],
      pointer: { canvas: { x: pointerX, y: pointerY } },
    });
  };

  const simulateDragEnd = (nodeId: string) => {
    eventHandlers["dragEnd"]({ nodes: [nodeId] });
  };

  beforeEach(() => {
    eventHandlers = {};

    mockNetwork = {
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      }),
      off: vi.fn(),
      getPositions: vi.fn().mockReturnValue({
        "1": { x: 100, y: 200 },
      }),
      destroy: vi.fn(),
    } as unknown as Network;

    mockNodesDataSet = {
      get: vi.fn().mockImplementation((id) => {
        if (id === "1") return { id: "1", label: "Node 1" };
        return null;
      }),
      update: vi.fn(),
    } as unknown as DataSet<VisNode>;

    mockEdgesDataSet = {
      get: vi.fn().mockReturnValue([{ id: "1-2", from: "1", to: "2" }]),
      remove: vi.fn(),
    } as unknown as DataSet<VisEdge>;
  });

  describe("connected nodes (nodes with edges)", () => {
    it("applies rubber band effect when dragged vertically within threshold", () => {
      setupHook();

      const startY = 200;
      const dragY = 230; // 30px drag, within threshold
      simulateDrag("1", startY, 150, dragY);

      const expectedY = startY + (dragY - startY) * RUBBER_BAND_FACTOR;

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          x: 150,
          y: expectedY,
        })
      );
    });

    it("snaps back to original Y position when drag ends within threshold", () => {
      setupHook();

      const startY = 200;
      simulateDrag("1", startY, 150, 230);

      vi.mocked(mockNodesDataSet.update).mockClear();
      mockNetwork.getPositions = vi.fn().mockReturnValue({
        "1": { x: 150, y: 204.5 }, // Current rubber-banded position
      });

      simulateDragEnd("1");

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          y: startY, // Snaps back to original
        })
      );
    });

    it("disconnects from hierarchy when dragged past threshold", () => {
      setupHook();

      const startY = 200;
      const dragY = startY + SNAP_OUT_THRESHOLD + 50; // Past threshold
      simulateDrag("1", startY, 150, dragY);

      expect(mockEdgesDataSet.remove).toHaveBeenCalledWith("1-2");
    });

    it("moves freely (no rubber band) after disconnecting", () => {
      setupHook();

      const startY = 200;
      // First drag past threshold to disconnect
      simulateDrag("1", startY, 150, startY + SNAP_OUT_THRESHOLD + 50);

      vi.mocked(mockNodesDataSet.update).mockClear();

      // Continue dragging
      eventHandlers["dragging"]({
        nodes: ["1"],
        pointer: { canvas: { x: 300, y: 500 } },
      });

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          x: 300,
          y: 500, // Exact pointer position, no rubber band
        })
      );
    });

    it("stays at dropped position after disconnecting (no snap back)", () => {
      setupHook();

      const startY = 200;
      simulateDrag("1", startY, 150, startY + SNAP_OUT_THRESHOLD + 50);

      vi.mocked(mockNodesDataSet.update).mockClear();

      simulateDragEnd("1");

      expect(mockNodesDataSet.update).not.toHaveBeenCalled();
    });
  });

  describe("free nodes (nodes without edges)", () => {
    beforeEach(() => {
      mockEdgesDataSet.get = vi.fn().mockReturnValue([]);
    });

    it("moves freely without rubber band effect", () => {
      setupHook();

      simulateDrag("1", 200, 300, 400);

      expect(mockNodesDataSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          x: 300,
          y: 400, // Exact pointer position
        })
      );
    });

    it("stays at dropped position (no snap back)", () => {
      setupHook();

      simulateDrag("1", 200, 300, 400);
      vi.mocked(mockNodesDataSet.update).mockClear();

      simulateDragEnd("1");

      expect(mockNodesDataSet.update).not.toHaveBeenCalled();
    });
  });
});
