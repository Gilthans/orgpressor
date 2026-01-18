import type { VisNode, VisEdge } from "../types";

/**
 * Position with x and y coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Configuration for the layout calculator
 */
export interface LayoutConfig {
  /** Canvas Y coordinate where roots should be positioned */
  targetRootY: number;
  /** Margin between hierarchy bottom and free nodes */
  freeNodesTopMargin: number;
  /** Spacing between free nodes in the grid */
  freeNodesSpacing: number;
}

/**
 * Input for layout calculation
 */
export interface LayoutInput {
  nodes: VisNode[];
  edges: VisEdge[];
  /** Current positions (e.g., from vis.js hierarchical layout) */
  positions: Record<string, Position>;
}

/**
 * Output from layout calculation
 */
export interface LayoutOutput {
  /** Final positions for all nodes */
  positions: Record<string, Position>;
  /** Bounding box of all nodes */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  /** IDs of nodes identified as roots */
  rootIds: Set<string>;
}

/**
 * Calculate optimal grid dimensions for free nodes.
 * Grid should be square or horizontal (cols >= rows) to fit horizontal scrolling.
 */
function calculateFreeNodesGrid(nodeCount: number): { cols: number; rows: number } {
  if (nodeCount === 0) return { cols: 0, rows: 0 };

  const sqrt = Math.sqrt(nodeCount);
  let rows = Math.floor(sqrt);
  let cols = Math.ceil(nodeCount / rows);

  // Ensure cols >= rows for horizontal/square shape
  while (cols < rows && rows > 1) {
    rows--;
    cols = Math.ceil(nodeCount / rows);
  }

  if (rows < 1) rows = 1;
  if (cols < 1) cols = nodeCount;

  return { cols, rows };
}

/**
 * Get all descendant IDs of a node (children, grandchildren, etc.)
 */
function getAllDescendantIds(rootId: string, edges: VisEdge[]): string[] {
  const childrenMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    const children = childrenMap.get(edge.from) || [];
    children.push(edge.to);
    childrenMap.set(edge.from, children);
  });

  const descendants: string[] = [];
  const stack = [rootId];

  while (stack.length > 0) {
    const nodeId = stack.pop()!;
    const children = childrenMap.get(nodeId) || [];
    for (const childId of children) {
      descendants.push(childId);
      stack.push(childId);
    }
  }

  return descendants;
}

/**
 * Get IDs of root nodes (nodes that have outgoing edges but no incoming edges)
 */
function getRootNodeIds(edges: VisEdge[]): Set<string> {
  const hasOutgoing = new Set<string>();
  const hasIncoming = new Set<string>();

  edges.forEach((edge) => {
    hasOutgoing.add(edge.from);
    hasIncoming.add(edge.to);
  });

  const rootIds = new Set<string>();
  hasOutgoing.forEach((id) => {
    if (!hasIncoming.has(id)) {
      rootIds.add(id);
    }
  });

  return rootIds;
}

/**
 * Calculates final positions for all nodes in a hierarchical layout.
 *
 * Takes positions from vis.js hierarchical layout (or any source) and:
 * 1. Shifts connected nodes so roots align at targetRootY
 * 2. Positions free nodes in a grid below the hierarchy
 */
export class LayoutCalculator {
  private readonly targetRootY: number;
  private readonly freeNodesTopMargin: number;
  private readonly freeNodesSpacing: number;

  constructor(config: LayoutConfig) {
    this.targetRootY = config.targetRootY;
    this.freeNodesTopMargin = config.freeNodesTopMargin;
    this.freeNodesSpacing = config.freeNodesSpacing;
  }

  /**
   * Calculate final positions for all nodes.
   */
  calculate(input: LayoutInput): LayoutOutput {
    const { nodes, edges, positions } = input;

    // Build sets to identify connected vs free nodes
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.from);
      connectedNodeIds.add(edge.to);
    });

    const rootIds = getRootNodeIds(edges);

    // Also include nodes marked as isRoot
    nodes.forEach((node) => {
      if (node.isRoot) {
        rootIds.add(node.id);
        connectedNodeIds.add(node.id);
      }
    });

    // Separate nodes
    const freeNodes = nodes.filter(
      (node) => !connectedNodeIds.has(node.id) && !node.isRoot
    );
    const connectedNodes = nodes.filter(
      (node) => connectedNodeIds.has(node.id) || node.isRoot
    );

    const result: Record<string, Position> = {};

    // Calculate Y shifts for connected nodes to align roots at targetRootY
    let hierarchyBottom = -Infinity;

    if (connectedNodes.length > 0) {
      if (rootIds.size > 1) {
        // Multiple DAGs: each DAG gets its own shift
        const nodeYShifts = new Map<string, number>();

        for (const rootId of rootIds) {
          const rootPos = positions[rootId];
          if (!rootPos) continue;

          const yShift = this.targetRootY - rootPos.y;
          nodeYShifts.set(rootId, yShift);

          const descendantIds = getAllDescendantIds(rootId, edges);
          for (const descId of descendantIds) {
            nodeYShifts.set(descId, yShift);
          }
        }

        connectedNodes.forEach((node) => {
          const pos = positions[node.id];
          const yShift = nodeYShifts.get(node.id) ?? 0;
          const newY = (pos?.y ?? 0) + yShift;
          result[node.id] = {
            x: pos?.x ?? 0,
            y: newY,
          };
          if (newY > hierarchyBottom) hierarchyBottom = newY;
        });
      } else {
        // Single DAG or single root: uniform shift
        let hierarchyTop = Infinity;
        connectedNodes.forEach((node) => {
          const pos = positions[node.id];
          if (pos && pos.y < hierarchyTop) hierarchyTop = pos.y;
          if (pos && pos.y > hierarchyBottom) hierarchyBottom = pos.y;
        });

        if (hierarchyTop === Infinity) hierarchyTop = 0;
        const yShift = this.targetRootY - hierarchyTop;

        connectedNodes.forEach((node) => {
          const pos = positions[node.id];
          result[node.id] = {
            x: pos?.x ?? 0,
            y: (pos?.y ?? 0) + yShift,
          };
        });

        hierarchyBottom = hierarchyBottom + yShift;
      }
    }

    if (hierarchyBottom === -Infinity) hierarchyBottom = this.targetRootY;

    // Position free nodes in a grid below the hierarchy
    const freeNodesStartY = hierarchyBottom + this.freeNodesTopMargin;
    const { cols } = calculateFreeNodesGrid(freeNodes.length);

    if (cols > 0) {
      const gridWidth = (cols - 1) * this.freeNodesSpacing;
      const startX = -gridWidth / 2;

      freeNodes.forEach((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        result[node.id] = {
          x: startX + col * this.freeNodesSpacing,
          y: freeNodesStartY + row * this.freeNodesSpacing,
        };
      });
    }

    // Calculate bounds
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    Object.values(result).forEach((pos) => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    // Handle empty case
    if (minX === Infinity) {
      minX = maxX = minY = maxY = 0;
    }

    return {
      positions: result,
      bounds: { minX, maxX, minY, maxY },
      rootIds,
    };
  }
}
