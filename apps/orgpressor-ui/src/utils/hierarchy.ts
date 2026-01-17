import type { DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";

/**
 * Get IDs of nodes that are part of the hierarchy (have edges or are roots)
 */
export function getSnappedNodeIds(
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): Set<string> {
  const snappedIds = new Set<string>();

  // Add nodes with edges
  edgesDataSet.get().forEach((edge) => {
    snappedIds.add(edge.from);
    snappedIds.add(edge.to);
  });

  // Add root nodes (even if they have no edges)
  nodesDataSet.get().forEach((node) => {
    if (node.isRoot) {
      snappedIds.add(node.id);
    }
  });

  return snappedIds;
}

/**
 * Check if a node is free (not part of hierarchy)
 */
export function isNodeFree(
  nodeId: string,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): boolean {
  const node = nodesDataSet.get(nodeId);
  if (node?.isRoot) return false;

  const connectedEdges = edgesDataSet.get({
    filter: (edge) => edge.from === nodeId || edge.to === nodeId,
  });
  return connectedEdges.length === 0;
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
