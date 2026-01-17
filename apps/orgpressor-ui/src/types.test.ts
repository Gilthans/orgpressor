import { describe, it, expect } from "vitest";
import { formatNodeLabel, updateNode } from "./types";
import type { VisNode } from "./types";

describe("formatNodeLabel", () => {
  it("returns just the name when metadata is undefined", () => {
    expect(formatNodeLabel("John Smith")).toBe("John Smith");
  });

  it("returns just the name when metadata is empty", () => {
    expect(formatNodeLabel("John Smith", {})).toBe("John Smith");
  });

  it("returns just the name when role is undefined", () => {
    expect(formatNodeLabel("John Smith", { role: undefined })).toBe("John Smith");
  });

  it("returns just the name when role is empty string", () => {
    expect(formatNodeLabel("John Smith", { role: "" })).toBe("John Smith");
  });

  it("formats name with role when role is provided", () => {
    expect(formatNodeLabel("John Smith", { role: "CEO" })).toBe(
      "<b>CEO</b>\nJohn Smith"
    );
  });

  it("handles role with spaces", () => {
    expect(formatNodeLabel("Jane Doe", { role: "Senior Manager" })).toBe(
      "<b>Senior Manager</b>\nJane Doe"
    );
  });
});

describe("updateNode", () => {
  const baseNode: VisNode = {
    id: "1",
    name: "John Smith",
    label: "John Smith",
    metadata: { role: "CEO" },
    x: 100,
    y: 200,
    isRoot: true,
  };

  it("preserves id, name, label, and metadata by default", () => {
    const updated = updateNode(baseNode, { x: 300 });

    expect(updated.id).toBe("1");
    expect(updated.name).toBe("John Smith");
    expect(updated.label).toBe("John Smith");
    expect(updated.metadata).toEqual({ role: "CEO" });
  });

  it("applies changes from the changes object", () => {
    const updated = updateNode(baseNode, { x: 300, y: 400 });

    expect(updated.x).toBe(300);
    expect(updated.y).toBe(400);
  });

  it("allows overriding preserved fields", () => {
    const updated = updateNode(baseNode, {
      label: "New Label",
      metadata: { role: "Manager" },
    });

    expect(updated.label).toBe("New Label");
    expect(updated.metadata).toEqual({ role: "Manager" });
  });

  it("handles node without optional fields", () => {
    const minimalNode: VisNode = {
      id: "2",
      name: "Jane Doe",
      label: "Jane Doe",
    };

    const updated = updateNode(minimalNode, { x: 50, isRoot: true });

    expect(updated.id).toBe("2");
    expect(updated.name).toBe("Jane Doe");
    expect(updated.label).toBe("Jane Doe");
    expect(updated.metadata).toBeUndefined();
    expect(updated.x).toBe(50);
    expect(updated.isRoot).toBe(true);
  });
});
