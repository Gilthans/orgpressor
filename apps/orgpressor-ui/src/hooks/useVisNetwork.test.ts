import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVisNetwork } from "./useVisNetwork";

describe("useVisNetwork", () => {
  const mockContainerRef = {
    current: document.createElement("div"),
  };

  const mockNodes = [
    { id: "1", label: "Node 1" },
    { id: "2", label: "Node 2" },
  ];

  const mockEdges = [{ from: "1", to: "2" }];

  const mockOptions = {};

  beforeEach(() => {
    mockContainerRef.current = document.createElement("div");
  });

  it("provides a network instance after mounting", async () => {
    const { result } = renderHook(() =>
      useVisNetwork({
        containerRef: mockContainerRef,
        nodes: mockNodes,
        edges: mockEdges,
        options: mockOptions,
      })
    );

    // This test catches the bug where network was null after mount
    await waitFor(() => {
      expect(result.current.network).not.toBeNull();
    });
  });

  it("provides datasets that contain the initial data", async () => {
    const { result } = renderHook(() =>
      useVisNetwork({
        containerRef: mockContainerRef,
        nodes: mockNodes,
        edges: mockEdges,
        options: mockOptions,
      })
    );

    await waitFor(() => {
      expect(result.current.network).not.toBeNull();
    });

    // Datasets should be usable
    expect(result.current.nodesDataSet.get("1")).toEqual({
      id: "1",
      label: "Node 1",
    });
    expect(result.current.edgesDataSet.get("1-2")).toEqual({
      id: "1-2",
      from: "1",
      to: "2",
    });
  });

  it("cleans up network on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useVisNetwork({
        containerRef: mockContainerRef,
        nodes: mockNodes,
        edges: mockEdges,
        options: mockOptions,
      })
    );

    await waitFor(() => {
      expect(result.current.network).not.toBeNull();
    });

    const networkInstance = result.current.network;
    unmount();

    expect(networkInstance?.destroy).toHaveBeenCalled();
  });
});
