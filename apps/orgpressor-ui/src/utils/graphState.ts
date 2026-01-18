import type { DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge, GraphChangeData } from "../types";
import { TOP_BAR_NODE_ID } from "../config";

/**
 * Extracts the current graph state from the DataSets.
 * Returns data suitable for persistence by the consuming application.
 * Excludes internal nodes like the top bar.
 */
export function extractGraphState(
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): GraphChangeData {
  const nodes = nodesDataSet
    .get()
    .filter((node) => node.id !== TOP_BAR_NODE_ID)
    .map((node) => ({
      id: node.id,
      name: node.name,
      metadata: node.metadata,
      isRoot: node.isRoot,
    }));

  const edges = edgesDataSet
    .get()
    .filter((edge) => edge.from !== TOP_BAR_NODE_ID && edge.to !== TOP_BAR_NODE_ID)
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
    }));

  return { nodes, edges };
}
