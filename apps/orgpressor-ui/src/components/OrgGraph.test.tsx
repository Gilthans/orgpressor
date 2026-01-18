import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { OrgGraph } from "./OrgGraph";
import * as hooks from "../hooks";

// Mock the hooks module
vi.mock("../hooks", () => ({
  useVisNetwork: vi.fn(),
  useLayout: vi.fn(),
  useNodeDrag: vi.fn(),
  useViewConstraints: vi.fn(),
  useCanvasTopBar: vi.fn(),
}));

describe("OrgGraph", () => {
  const defaultNodes = [
    { id: "1", label: "Alice" },
    { id: "2", label: "Bob" },
  ];

  const defaultEdges = [{ from: "1", to: "2" }];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventHandlers: Record<string, (...args: any[]) => void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockNetwork: any;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};

    mockNetwork = {
      on: vi.fn((event: string, handler: () => void) => {
        eventHandlers[event] = handler;
      }),
      off: vi.fn(),
      getSelectedNodes: vi.fn().mockReturnValue([]),
      selectNodes: vi.fn(),
      unselectAll: vi.fn(),
    };

    vi.mocked(hooks.useVisNetwork).mockReturnValue({
      network: mockNetwork,
      nodesDataSet: {
        get: vi.fn().mockReturnValue([
          { id: "1", name: "Alice", label: "Alice" },
          { id: "2", name: "Bob", label: "Bob" },
        ]),
        update: vi.fn(),
      },
      edgesDataSet: {
        get: vi.fn().mockReturnValue([{ id: "1-2", from: "1", to: "2" }]),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(hooks.useLayout).mockImplementation(() => {});
    vi.mocked(hooks.useNodeDrag).mockImplementation(() => {});
    vi.mocked(hooks.useViewConstraints).mockImplementation(() => {});
  });

  describe("rendering", () => {
    it("renders the container", () => {
      const { container } = render(<OrgGraph nodes={defaultNodes} edges={defaultEdges} />);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("accepts onChange prop without error", () => {
      const onChange = vi.fn();
      expect(() => {
        render(<OrgGraph nodes={defaultNodes} edges={defaultEdges} onChange={onChange} />);
      }).not.toThrow();
    });

    it("accepts selectedNodeId prop without error", () => {
      expect(() => {
        render(<OrgGraph nodes={defaultNodes} edges={defaultEdges} selectedNodeId="1" />);
      }).not.toThrow();
    });

    it("accepts onSelectedNodeChange prop without error", () => {
      const onSelectedNodeChange = vi.fn();
      expect(() => {
        render(<OrgGraph nodes={defaultNodes} edges={defaultEdges} onSelectedNodeChange={onSelectedNodeChange} />);
      }).not.toThrow();
    });
  });

  describe("onSelectedNodeChange callback", () => {
    it("calls onSelectedNodeChange with node id when node is clicked", () => {
      const onSelectedNodeChange = vi.fn();

      render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          onSelectedNodeChange={onSelectedNodeChange}
        />
      );

      // Simulate click on node
      eventHandlers["click"]?.({ nodes: ["1"] });

      expect(onSelectedNodeChange).toHaveBeenCalledWith("1");
    });

    it("calls onSelectedNodeChange with null when empty space is clicked", () => {
      const onSelectedNodeChange = vi.fn();

      render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          onSelectedNodeChange={onSelectedNodeChange}
        />
      );

      // Simulate click on empty space
      eventHandlers["click"]?.({ nodes: [] });

      expect(onSelectedNodeChange).toHaveBeenCalledWith(null);
    });

    it("does not error when onSelectedNodeChange is not provided", () => {
      render(<OrgGraph nodes={defaultNodes} edges={defaultEdges} />);

      // Should not throw
      expect(() => {
        eventHandlers["click"]?.({ nodes: ["1"] });
      }).not.toThrow();
    });
  });

  describe("selectedNodeId synchronization", () => {
    it("selects node in network when selectedNodeId is set", () => {
      render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          selectedNodeId="1"
        />
      );

      expect(mockNetwork.selectNodes).toHaveBeenCalledWith(["1"]);
    });

    it("unselects all when selectedNodeId is null and a node was selected", () => {
      mockNetwork.getSelectedNodes.mockReturnValue(["1"]);

      render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          selectedNodeId={null}
        />
      );

      expect(mockNetwork.unselectAll).toHaveBeenCalled();
    });

    it("does not call selectNodes when selectedNodeId matches current selection", () => {
      mockNetwork.getSelectedNodes.mockReturnValue(["1"]);

      render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          selectedNodeId="1"
        />
      );

      expect(mockNetwork.selectNodes).not.toHaveBeenCalled();
    });

    it("updates selection when selectedNodeId prop changes", () => {
      const { rerender } = render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          selectedNodeId={null}
        />
      );

      // Change to select node 1
      rerender(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          selectedNodeId="1"
        />
      );

      expect(mockNetwork.selectNodes).toHaveBeenCalledWith(["1"]);
    });
  });

  describe("onChange callback", () => {
    it("passes onHierarchyChange to useNodeDrag", () => {
      const onChange = vi.fn();

      render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          onChange={onChange}
        />
      );

      // Verify useNodeDrag was called with onHierarchyChange
      expect(hooks.useNodeDrag).toHaveBeenCalledWith(
        expect.objectContaining({
          onHierarchyChange: expect.any(Function),
        })
      );
    });

    it("calls onChange with graph state when hierarchy changes", () => {
      const onChange = vi.fn();
      let capturedOnHierarchyChange: (() => void) | undefined;

      vi.mocked(hooks.useNodeDrag).mockImplementation((props) => {
        capturedOnHierarchyChange = props.onHierarchyChange;
      });

      render(
        <OrgGraph
          nodes={defaultNodes}
          edges={defaultEdges}
          onChange={onChange}
        />
      );

      // Trigger the hierarchy change callback
      capturedOnHierarchyChange?.();

      expect(onChange).toHaveBeenCalledWith({
        nodes: expect.any(Array),
        edges: expect.any(Array),
      });
    });
  });
});
