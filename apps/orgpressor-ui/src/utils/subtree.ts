import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge, SubtreeContext } from "../types";
import { getAllDescendantIds } from "./hierarchy";

// Re-export SubtreeContext for convenience
export type { SubtreeContext } from "../types";

/**
 * Captures a subtree's structure at the current moment.
 * Records the root node's descendants and their positions relative to the root.
 */
export function captureSubtree(
  network: Network,
  edgesDataSet: DataSet<VisEdge>,
  nodeId: string
): SubtreeContext {
  const descendantIds = getAllDescendantIds(nodeId, edgesDataSet);
  const allNodeIds = [nodeId, ...descendantIds];
  const positions = network.getPositions(allNodeIds);

  const rootPos = positions[nodeId];
  const relativePositions: Record<string, { dx: number; dy: number }> = {};

  descendantIds.forEach((id) => {
    const pos = positions[id];
    if (pos) {
      relativePositions[id] = {
        dx: pos.x - rootPos.x,
        dy: pos.y - rootPos.y,
      };
    }
  });

  return {
    rootId: nodeId,
    descendantIds,
    relativePositions,
  };
}

/**
 * Creates position updates for moving a subtree to a new location.
 * This is the default way to move nodes - it always moves the entire subtree.
 *
 * @param nodesDataSet - The nodes dataset (for getting labels)
 * @param subtree - The subtree context
 * @param newX - New X position for the root
 * @param newY - New Y position for the root
 * @param rootProps - Additional properties to set on the root node (e.g., isRoot)
 */
export function createSubtreeMoveUpdates(
  nodesDataSet: DataSet<VisNode>,
  subtree: SubtreeContext,
  newX: number,
  newY: number,
  rootProps?: Partial<VisNode>
): VisNode[] {
  const { rootId, descendantIds, relativePositions } = subtree;

  const rootNode = nodesDataSet.get(rootId);
  const updates: VisNode[] = [
    {
      id: rootId,
      name: rootNode?.name || "",
      label: rootNode?.label || "",
      metadata: rootNode?.metadata,
      x: newX,
      y: newY,
      ...rootProps,
    },
  ];

  descendantIds.forEach((id) => {
    const rel = relativePositions[id];
    if (rel) {
      const node = nodesDataSet.get(id);
      updates.push({
        id,
        name: node?.name || "",
        label: node?.label || "",
        metadata: node?.metadata,
        x: newX + rel.dx,
        y: newY + rel.dy,
      });
    }
  });

  return updates;
}

/**
 * Moves a subtree to a new position and updates the dataset.
 * This is a convenience function that creates updates and applies them.
 */
export function moveSubtree(
  nodesDataSet: DataSet<VisNode>,
  subtree: SubtreeContext,
  newX: number,
  newY: number,
  rootProps?: Partial<VisNode>
): void {
  const updates = createSubtreeMoveUpdates(nodesDataSet, subtree, newX, newY, rootProps);
  nodesDataSet.update(updates);
}

/**
 * Get the set of all node IDs in a subtree (including the root).
 */
export function getSubtreeNodeIds(subtree: SubtreeContext): Set<string> {
  return new Set([subtree.rootId, ...subtree.descendantIds]);
}
