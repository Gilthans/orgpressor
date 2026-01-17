import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock DataSet class
class MockDataSet<T extends { id: string }> {
  private items: Map<string, T>;

  constructor(data: T[] = []) {
    this.items = new Map(data.map((item) => [item.id, item]));
  }

  get(idOrFilter?: string | { filter: (item: T) => boolean }): T | T[] | undefined {
    if (typeof idOrFilter === "string") {
      return this.items.get(idOrFilter);
    }
    if (idOrFilter?.filter) {
      return Array.from(this.items.values()).filter(idOrFilter.filter);
    }
    return Array.from(this.items.values());
  }

  update = vi.fn();
  remove = vi.fn();
  add = vi.fn();
  clear = vi.fn();
}

// Mock Network class
class MockNetwork {
  on = vi.fn();
  off = vi.fn();
  destroy = vi.fn();
  getPositions = vi.fn().mockReturnValue({});
  getBoundingBox = vi.fn().mockReturnValue({ top: 0, left: 0, right: 100, bottom: 50 });
}

// Mock vis-network
vi.mock("vis-network/standalone", () => {
  return {
    Network: MockNetwork,
    DataSet: MockDataSet,
  };
});
