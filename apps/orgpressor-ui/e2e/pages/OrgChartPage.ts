import { Page, Locator } from "@playwright/test";
import { TOP_BAR_CENTER_Y, SNAP_OUT_THRESHOLD, VIEWPORT } from "../test-utils";
import type { GraphAccessor, NodeStateInfo, EdgeStateInfo, Position } from "../../src/types";

// Re-export types from src for test convenience
export type { Position, NodeStateInfo as NodeInfo, EdgeStateInfo as EdgeInfo };

// Declare the window extension for TypeScript
declare global {
  interface Window {
    __GRAPH_ACCESSOR__?: GraphAccessor;
  }
}

interface DragOptions {
  steps?: number;
  stepDelay?: number;
}

const DEFAULT_DRAG_OPTIONS: Required<DragOptions> = {
  steps: 20,
  stepDelay: 10,
};

// =============================================================================
// OrgChartPage - Page Object Model
// =============================================================================

export class OrgChartPage {
  readonly page: Page;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator("canvas");
  }

  // ===========================================================================
  // Setup & Navigation
  // ===========================================================================

  async goto(): Promise<void> {
    await this.page.setViewportSize(VIEWPORT);
    await this.page.goto("/");
    await this.canvas.waitFor();
    await this.waitForGraphAccessor();
    await this.waitForStableLayout();
  }

  /**
   * Wait for the graph accessor API to become available.
   */
  private async waitForGraphAccessor(timeoutMs = 5000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const available = await this.page.evaluate(() => {
        return typeof window.__GRAPH_ACCESSOR__ !== "undefined";
      });
      if (available) return;
      await this.page.waitForTimeout(100);
    }
    throw new Error("Graph accessor not available after timeout");
  }

  // ===========================================================================
  // Graph Data Access (via GraphAccessor API)
  // ===========================================================================

  /**
   * Get all node information including dynamically calculated positions.
   */
  async getNodes(): Promise<NodeStateInfo[]> {
    return await this.page.evaluate(() => {
      const accessor = window.__GRAPH_ACCESSOR__;
      if (!accessor) throw new Error("Graph accessor not available");
      return accessor.getNodes();
    });
  }

  /**
   * Get a specific node's information by label.
   */
  async getNode(label: string): Promise<NodeStateInfo | null> {
    const nodes = await this.getNodes();
    return nodes.find((n) => n.label === label) || null;
  }

  /**
   * Get a node's current position by label.
   */
  async getNodePosition(label: string): Promise<Position> {
    const node = await this.getNode(label);
    if (!node) throw new Error(`Node "${label}" not found`);
    return node.position;
  }

  /**
   * Get all edges with their styling information.
   */
  async getEdges(): Promise<EdgeStateInfo[]> {
    return await this.page.evaluate(() => {
      const accessor = window.__GRAPH_ACCESSOR__;
      if (!accessor) throw new Error("Graph accessor not available");
      return accessor.getEdges();
    });
  }

  /**
   * Check if two nodes are connected (parent -> child).
   */
  async areConnected(parentLabel: string, childLabel: string): Promise<boolean> {
    const [parent, child, edges] = await Promise.all([
      this.getNode(parentLabel),
      this.getNode(childLabel),
      this.getEdges(),
    ]);

    if (!parent || !child) return false;
    return edges.some((e) => e.from === parent.id && e.to === child.id);
  }

  /**
   * Get children of a node.
   */
  async getChildren(parentLabel: string): Promise<NodeStateInfo[]> {
    const [parent, edges, nodes] = await Promise.all([
      this.getNode(parentLabel),
      this.getEdges(),
      this.getNodes(),
    ]);

    if (!parent) return [];

    const childIds = edges.filter((e) => e.from === parent.id).map((e) => e.to);
    return nodes.filter((n) => childIds.includes(n.id));
  }

  /**
   * Get root nodes.
   */
  async getRootNodes(): Promise<NodeStateInfo[]> {
    const nodes = await this.getNodes();
    return nodes.filter((n) => n.isRoot);
  }

  /**
   * Get free nodes (not connected to any hierarchy).
   */
  async getFreeNodes(): Promise<NodeStateInfo[]> {
    const [nodes, edges] = await Promise.all([this.getNodes(), this.getEdges()]);

    // A node is free if it has no parent edge and is not a root
    const nodesWithParent = new Set(edges.map((e) => e.to));
    return nodes.filter((n) => !n.isRoot && !nodesWithParent.has(n.id));
  }

  // ===========================================================================
  // Actions
  // ===========================================================================

  /**
   * Drag from one position to another.
   */
  async drag(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options: DragOptions = {}
  ): Promise<void> {
    const { steps, stepDelay } = { ...DEFAULT_DRAG_OPTIONS, ...options };

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();

    for (let i = 1; i <= steps; i++) {
      const x = startX + ((endX - startX) * i) / steps;
      const y = startY + ((endY - startY) * i) / steps;
      await this.page.mouse.move(x, y);
      if (stepDelay > 0) {
        await this.page.waitForTimeout(stepDelay);
      }
    }

    await this.page.mouse.up();
  }

  /**
   * Make a node a root by dragging it to the top bar.
   */
  async makeRoot(nodeLabel: string, targetX?: number): Promise<void> {
    const pos = await this.getNodePosition(nodeLabel);
    const destX = targetX ?? pos.x;
    await this.drag(pos.x, pos.y, destX, TOP_BAR_CENTER_Y);
    await this.waitForStableLayout();
  }

  /**
   * Connect one node to another by dragging.
   */
  async connectNodes(fromLabel: string, toLabel: string): Promise<void> {
    const [fromPos, toPos] = await Promise.all([
      this.getNodePosition(fromLabel),
      this.getNodePosition(toLabel),
    ]);
    await this.drag(fromPos.x, fromPos.y, toPos.x, toPos.y);
    await this.waitForStableLayout();
  }

  /**
   * Snap out a node from its parent by dragging past threshold.
   */
  async snapOutNode(
    nodeLabel: string,
    direction: "down" | "up" | "left" | "right" = "down",
    extraDistance: number = 100
  ): Promise<Position> {
    const pos = await this.getNodePosition(nodeLabel);
    const distance = SNAP_OUT_THRESHOLD + extraDistance;

    let endX = pos.x;
    let endY = pos.y;

    switch (direction) {
      case "down":
        endY = pos.y + distance;
        break;
      case "up":
        endY = pos.y - distance;
        break;
      case "left":
        endX = pos.x - distance;
        break;
      case "right":
        endX = pos.x + distance;
        break;
    }

    await this.drag(pos.x, pos.y, endX, endY);
    await this.waitForStableLayout();
    return { x: endX, y: endY };
  }

  /**
   * Snap out a node and connect it to another node.
   */
  async snapOutAndConnectTo(
    nodeLabel: string,
    targetLabel: string,
    direction: "down" | "up" | "left" | "right" = "down"
  ): Promise<void> {
    await this.snapOutNode(nodeLabel, direction);
    // Get actual positions after snap-out (layout may have shifted nodes)
    const nodePos = await this.getNodePosition(nodeLabel);
    const targetPos = await this.getNodePosition(targetLabel);
    await this.drag(nodePos.x, nodePos.y, targetPos.x, targetPos.y);
    await this.waitForStableLayout();
  }

  // ===========================================================================
  // Layout & Stability
  // ===========================================================================

  /**
   * Wait for the canvas layout to stabilize.
   */
  async waitForStableLayout(timeoutMs = 500): Promise<void> {
    const POLL_INTERVAL = 50;
    let prev = await this.canvas.screenshot();
    let stable = false;
    const startTime = Date.now();

    while (!stable && Date.now() - startTime < timeoutMs) {
      await this.page.waitForTimeout(POLL_INTERVAL);
      const current = await this.canvas.screenshot();
      stable = Buffer.compare(prev, current) === 0;
      prev = current;
    }
  }

  /**
   * Take a canvas snapshot.
   */
  async takeSnapshot(): Promise<Buffer> {
    return await this.canvas.screenshot();
  }

  /**
   * Execute an action and verify the layout changed.
   */
  async expectLayoutChanged(action: () => Promise<void>): Promise<void> {
    const before = await this.takeSnapshot();
    await action();
    await this.waitForStableLayout();
    const after = await this.takeSnapshot();

    if (Buffer.compare(before, after) === 0) {
      throw new Error("Expected layout to change, but it remained the same");
    }
  }
}
