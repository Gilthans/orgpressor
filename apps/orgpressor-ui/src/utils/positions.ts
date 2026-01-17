import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode } from "../types";

export type NodePositions = Record<string, { x: number; y: number }>;

/**
 * Capture positions of all nodes
 */
export function captureAllPositions(
  network: Network,
  nodesDataSet: DataSet<VisNode>
): NodePositions {
  const allNodeIds = nodesDataSet.get().map((n) => n.id);
  return network.getPositions(allNodeIds);
}

/**
 * Find the rightmost X position among a set of nodes
 */
export function findRightmostX(
  nodeIds: string[],
  positions: NodePositions
): number {
  let maxX = -Infinity;
  nodeIds.forEach((id) => {
    const pos = positions[id];
    if (pos && pos.x > maxX) {
      maxX = pos.x;
    }
  });
  return maxX === -Infinity ? 0 : maxX;
}

/**
 * Create position updates for all nodes except excluded ones
 */
export function createPositionUpdates(
  nodesDataSet: DataSet<VisNode>,
  positions: NodePositions,
  excludeIds: string[] = []
): VisNode[] {
  const excludeSet = new Set(excludeIds);
  return nodesDataSet
    .get()
    .filter((node) => !excludeSet.has(node.id))
    .map((node) => ({
      id: node.id,
      label: node.label,
      x: positions[node.id]?.x ?? 0,
      y: positions[node.id]?.y ?? 0,
    }));
}

/**
 * Check if two bounding boxes overlap
 */
export function boxesOverlap(
  a: { top: number; left: number; right: number; bottom: number },
  b: { top: number; left: number; right: number; bottom: number }
): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}
