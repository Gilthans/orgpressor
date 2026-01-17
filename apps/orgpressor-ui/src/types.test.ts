import { describe, it, expect } from "vitest";
import { formatNodeLabel } from "./types";

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
