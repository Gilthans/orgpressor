import { useEffect } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import { updateNode } from "../types";
import type { VisNode, VisEdge } from "../types";
import {
  FREE_NODES_TOP_MARGIN,
  FREE_NODES_SPACING,
  ROOT_Y_IN_TOP_BAR,
} from "../config";
import { getRootNodeIds, getAllDescendantIds } from "../utils/hierarchy";
import { domToCanvasY } from "../utils/network";

/**
 * Calculate optimal grid dimensions for free nodes.
 * Grid should be square or horizontal (cols >= rows) to fit horizontal scrolling.
 */
function calculateFreeNodesGrid(nodeCount: number): { cols: number; rows: number } {
  if (nodeCount === 0) return { cols: 0, rows: 0 };

  // Start with a square-ish grid based on sqrt
  const sqrt = Math.sqrt(nodeCount);
  let rows = Math.floor(sqrt);
  let cols = Math.ceil(nodeCount / rows);

  // Ensure cols >= rows for horizontal/square shape
  while (cols < rows && rows > 1) {
    rows--;
    cols = Math.ceil(nodeCount / rows);
  }

  // Safety check: ensure at least 1 row and 1 column
  if (rows < 1) rows = 1;
  if (cols < 1) cols = nodeCount;

  return { cols, rows };
}

interface UseLayoutProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
}

/**
 * Handles initial layout arrangement of nodes.
 * Positions roots in the top bar and free nodes below the hierarchy.
 *
 * Note: Resize handling is done by useViewConstraints, which manages all view state.
 */
export function useLayout({
  network,
  nodesDataSet,
  edgesDataSet,
}: UseLayoutProps): void {
  useEffect(() => {
    if (!network) return;

    const arrangeNodes = () => {
      const allNodes = nodesDataSet.get();
      const allEdges = edgesDataSet.get();

      // Find nodes that are part of the hierarchy (have edges)
      const connectedNodeIds = new Set<string>();
      const childNodeIds = new Set<string>();
      allEdges.forEach((edge) => {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
        childNodeIds.add(edge.to);
      });

      // Identify root nodes (connected but not a child of anyone)
      const rootNodeIds = getRootNodeIds(edgesDataSet);

      // Separate free nodes from connected nodes
      const freeNodes = allNodes.filter(
        (node) => !connectedNodeIds.has(node.id) && !node.isRoot
      );
      const connectedNodes = allNodes.filter(
        (node) => connectedNodeIds.has(node.id) || node.isRoot
      );

      if (connectedNodes.length === 0 && freeNodes.length === 0) return;

      // Get current positions
      const positions = network.getPositions();

      // Find hierarchy bounds
      let hierarchyTop = Infinity;
      let hierarchyBottom = -Infinity;

      connectedNodes.forEach((node) => {
        const pos = positions[node.id];
        if (pos) {
          if (pos.y < hierarchyTop) hierarchyTop = pos.y;
          if (pos.y > hierarchyBottom) hierarchyBottom = pos.y;
        }
      });

      // If no connected nodes, set defaults
      if (hierarchyTop === Infinity) hierarchyTop = 0;
      if (hierarchyBottom === -Infinity) hierarchyBottom = 0;

      // Target Y position for roots (in canvas coordinates) - centered in top bar
      const targetRootY = domToCanvasY(network, ROOT_Y_IN_TOP_BAR);

      // For multiple roots (multiple DAGs), each DAG needs its own shift
      // to align all roots at the same Y position in the top bar.
      // For single root, use the simpler calculation.
      let connectedUpdates: VisNode[];

      if (rootNodeIds.size > 1) {
        // Multiple DAGs: calculate per-DAG shifts
        const nodeYShifts = new Map<string, number>();

        for (const rootId of rootNodeIds) {
          const rootPos = positions[rootId];
          if (!rootPos) continue;

          const yShift = targetRootY - rootPos.y;
          nodeYShifts.set(rootId, yShift);

          const descendantIds = getAllDescendantIds(rootId, edgesDataSet);
          for (const descId of descendantIds) {
            nodeYShifts.set(descId, yShift);
          }
        }

        connectedUpdates = connectedNodes.map((node) => {
          const yShift = nodeYShifts.get(node.id) ?? 0;
          return updateNode(node, {
            x: positions[node.id]?.x ?? 0,
            y: (positions[node.id]?.y ?? 0) + yShift,
            isRoot: rootNodeIds.has(node.id) || node.isRoot,
          });
        });

        // Update hierarchyBottom with the shifts applied
        hierarchyBottom = -Infinity;
        connectedNodes.forEach((node) => {
          const pos = positions[node.id];
          if (pos) {
            const yShift = nodeYShifts.get(node.id) ?? 0;
            const newY = pos.y + yShift;
            if (newY > hierarchyBottom) hierarchyBottom = newY;
          }
        });
      } else {
        // Single DAG: use simpler shift for all nodes
        const yShift = targetRootY - hierarchyTop;
        connectedUpdates = connectedNodes.map((node) =>
          updateNode(node, {
            x: positions[node.id]?.x ?? 0,
            y: (positions[node.id]?.y ?? 0) + yShift,
            isRoot: rootNodeIds.has(node.id) || node.isRoot,
          })
        );

        // Update hierarchyBottom for free nodes positioning
        hierarchyBottom = hierarchyBottom + yShift;
      }

      // Position free nodes in a grid below the shifted hierarchy
      // Note: hierarchyBottom has already been updated with shifts applied above
      const freeNodesStartY = hierarchyBottom + FREE_NODES_TOP_MARGIN;

      // Get optimal grid dimensions (square or horizontal)
      // The grid will be as square as possible while maintaining cols >= rows
      const { cols } = calculateFreeNodesGrid(freeNodes.length);

      // Calculate grid width and center it at X=0
      // Note: Centering on the hierarchy would be ideal but causes issues with
      // coordinate transformations during drag operations. The view centering
      // at the end of layout ensures all nodes are visible.
      const gridWidth = (cols - 1) * FREE_NODES_SPACING;
      const startX = -gridWidth / 2;

      const freeUpdates: VisNode[] = freeNodes.map((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        return updateNode(node, {
          x: startX + col * FREE_NODES_SPACING,
          y: freeNodesStartY + row * FREE_NODES_SPACING,
        });
      });

      // Apply all updates (view positioning is handled by useViewConstraints)
      nodesDataSet.update([...connectedUpdates, ...freeUpdates]);
    };

    // Wait for hierarchical layout to complete, then arrange free nodes
    network.once("stabilized", arrangeNodes);

    // Also run on initial load after a short delay
    const timeoutId = setTimeout(arrangeNodes, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [network, nodesDataSet, edgesDataSet]);
}
