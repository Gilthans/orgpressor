import type { DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge, HierarchyEdge } from "../types";
import { TOP_BAR_NODE_ID } from "../config";

/**
 * Detects if the given edges form a cycle (not a valid DAG).
 * Uses DFS with three states: unvisited (0), visiting (1), visited (2).
 * A back edge to a "visiting" node indicates a cycle.
 *
 * @throws Error if a cycle is detected, with details about the cycle path
 */
export function validateNoCycles(edges: HierarchyEdge[]): void {
  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  const allNodes = new Set<string>();

  for (const edge of edges) {
    // Self-loop is a cycle
    if (edge.from === edge.to) {
      throw new Error(
        `Cycle detected: node "${edge.from}" has a self-referencing edge`
      );
    }

    allNodes.add(edge.from);
    allNodes.add(edge.to);

    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, []);
    }
    adjacency.get(edge.from)!.push(edge.to);
  }

  // DFS state: 0 = unvisited, 1 = visiting, 2 = visited
  const state = new Map<string, number>();
  const parent = new Map<string, string | null>();

  function dfs(nodeId: string, path: string[]): void {
    state.set(nodeId, 1); // Mark as visiting
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const neighborState = state.get(neighbor) || 0;

      if (neighborState === 1) {
        // Back edge found - cycle detected
        // Find the cycle portion of the path
        const cycleStart = path.indexOf(neighbor);
        const cyclePath = [...path.slice(cycleStart), neighbor];
        throw new Error(
          `Cycle detected in hierarchy: ${cyclePath.join(" -> ")}`
        );
      }

      if (neighborState === 0) {
        parent.set(neighbor, nodeId);
        dfs(neighbor, path);
      }
    }

    path.pop();
    state.set(nodeId, 2); // Mark as visited
  }

  // Run DFS from each unvisited node (handles disconnected components)
  for (const nodeId of allNodes) {
    if ((state.get(nodeId) || 0) === 0) {
      dfs(nodeId, []);
    }
  }
}

/**
 * Get IDs of nodes that are part of the hierarchy (have edges or are roots).
 * Excludes the special top bar node.
 */
export function getSnappedNodeIds(
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): Set<string> {
  const snappedIds = new Set<string>();

  // Add nodes with edges
  edgesDataSet.get().forEach((edge) => {
    if (edge.from !== TOP_BAR_NODE_ID) snappedIds.add(edge.from);
    if (edge.to !== TOP_BAR_NODE_ID) snappedIds.add(edge.to);
  });

  // Add root nodes (even if they have no edges)
  nodesDataSet.get().forEach((node) => {
    if (node.isRoot && node.id !== TOP_BAR_NODE_ID) {
      snappedIds.add(node.id);
    }
  });

  return snappedIds;
}

/**
 * Check if a node is free (not part of hierarchy).
 * A node is free if it has no parent and is not a root.
 * Having children does not make a node "snapped".
 */
export function isNodeFree(
  nodeId: string,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): boolean {
  const node = nodesDataSet.get(nodeId);
  if (node?.isRoot) return false;

  // Check for parent edge (where this node is the child/target)
  const parentEdges = edgesDataSet.get({
    filter: (edge) => edge.to === nodeId,
  });
  return parentEdges.length === 0;
}

/**
 * Get IDs of root nodes (nodes that have children but no parent)
 */
export function getRootNodeIds(edgesDataSet: DataSet<VisEdge>): Set<string> {
  const connectedNodeIds = new Set<string>();
  const childNodeIds = new Set<string>();

  edgesDataSet.get().forEach((edge) => {
    connectedNodeIds.add(edge.from);
    connectedNodeIds.add(edge.to);
    childNodeIds.add(edge.to);
  });

  const rootNodeIds = new Set<string>();
  connectedNodeIds.forEach((id) => {
    if (!childNodeIds.has(id)) {
      rootNodeIds.add(id);
    }
  });

  return rootNodeIds;
}

/**
 * Get IDs of children for a given parent node
 */
export function getChildNodeIds(
  parentId: string,
  edgesDataSet: DataSet<VisEdge>
): string[] {
  return edgesDataSet
    .get({ filter: (edge) => edge.from === parentId })
    .map((edge) => edge.to);
}

/**
 * Get edges connected to a node (as parent or child)
 */
export function getConnectedEdges(
  nodeId: string,
  edgesDataSet: DataSet<VisEdge>
): VisEdge[] {
  return edgesDataSet.get({
    filter: (edge) => edge.from === nodeId || edge.to === nodeId,
  }) as VisEdge[];
}

/**
 * Get IDs of all descendants (children, grandchildren, etc.) of a node.
 * Throws an error if a cycle is detected in the hierarchy.
 */
export function getAllDescendantIds(
  nodeId: string,
  edgesDataSet: DataSet<VisEdge>
): string[] {
  const visited = new Set<string>([nodeId]);
  const descendants: string[] = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = getChildNodeIds(currentId, edgesDataSet);
    children.forEach((childId) => {
      if (visited.has(childId)) {
        throw new Error(
          `Cycle detected in hierarchy: node "${childId}" appears multiple times`
        );
      }
      visited.add(childId);
      descendants.push(childId);
      queue.push(childId);
    });
  }

  return descendants;
}

/**
 * Get the edge from a node's parent (where this node is the 'to')
 */
export function getParentEdge(
  nodeId: string,
  edgesDataSet: DataSet<VisEdge>
): VisEdge | null {
  const edges = edgesDataSet.get({
    filter: (edge) => edge.to === nodeId,
  });
  return edges.length > 0 ? (edges[0] as VisEdge) : null;
}
