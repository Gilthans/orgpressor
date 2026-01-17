import { describe, it, expect, vi } from "vitest";
import type { DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import { extractGraphState } from "./graphState";

describe("extractGraphState", () => {
  it("extracts nodes with id, name, metadata, and isRoot", () => {
    const mockNodesDataSet = {
      get: vi.fn().mockReturnValue([
        { id: "1", name: "Alice", label: "Alice", metadata: { role: "CEO" }, isRoot: true },
        { id: "2", name: "Bob", label: "Bob", metadata: undefined, isRoot: false },
        { id: "3", name: "Carol", label: "Carol" },
      ]),
    } as unknown as DataSet<VisNode>;

    const mockEdgesDataSet = {
      get: vi.fn().mockReturnValue([]),
    } as unknown as DataSet<VisEdge>;

    const result = extractGraphState(mockNodesDataSet, mockEdgesDataSet);

    expect(result.nodes).toEqual([
      { id: "1", name: "Alice", metadata: { role: "CEO" }, isRoot: true },
      { id: "2", name: "Bob", metadata: undefined, isRoot: false },
      { id: "3", name: "Carol", metadata: undefined, isRoot: undefined },
    ]);
  });

  it("extracts edges with from and to only", () => {
    const mockNodesDataSet = {
      get: vi.fn().mockReturnValue([]),
    } as unknown as DataSet<VisNode>;

    const mockEdgesDataSet = {
      get: vi.fn().mockReturnValue([
        { id: "1-2", from: "1", to: "2", dashes: true, title: "Auto" },
        { id: "1-3", from: "1", to: "3" },
      ]),
    } as unknown as DataSet<VisEdge>;

    const result = extractGraphState(mockNodesDataSet, mockEdgesDataSet);

    expect(result.edges).toEqual([
      { from: "1", to: "2" },
      { from: "1", to: "3" },
    ]);
  });

  it("excludes internal properties like color, x, y, label from nodes", () => {
    const mockNodesDataSet = {
      get: vi.fn().mockReturnValue([
        {
          id: "1",
          name: "Alice",
          label: "<b>CEO</b>\nAlice",
          metadata: { role: "CEO" },
          isRoot: true,
          x: 100,
          y: 200,
          color: { background: "#fff", border: "#000" },
        },
      ]),
    } as unknown as DataSet<VisNode>;

    const mockEdgesDataSet = {
      get: vi.fn().mockReturnValue([]),
    } as unknown as DataSet<VisEdge>;

    const result = extractGraphState(mockNodesDataSet, mockEdgesDataSet);

    expect(result.nodes[0]).toEqual({
      id: "1",
      name: "Alice",
      metadata: { role: "CEO" },
      isRoot: true,
    });
    expect(result.nodes[0]).not.toHaveProperty("x");
    expect(result.nodes[0]).not.toHaveProperty("y");
    expect(result.nodes[0]).not.toHaveProperty("color");
    expect(result.nodes[0]).not.toHaveProperty("label");
  });

  it("returns empty arrays when no nodes or edges exist", () => {
    const mockNodesDataSet = {
      get: vi.fn().mockReturnValue([]),
    } as unknown as DataSet<VisNode>;

    const mockEdgesDataSet = {
      get: vi.fn().mockReturnValue([]),
    } as unknown as DataSet<VisEdge>;

    const result = extractGraphState(mockNodesDataSet, mockEdgesDataSet);

    expect(result).toEqual({ nodes: [], edges: [] });
  });
});
