import { useEffect } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import { updateNode } from "../types";
import type { VisNode, VisEdge } from "../types";
import {
  FREE_NODES_TOP_MARGIN,
  FREE_NODES_SPACING,
  ROOT_Y_IN_TOP_BAR,
} from "../config";
import { domToCanvasY } from "../utils/network";
import { LayoutCalculator } from "../utils/layout";

interface UseLayoutProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
}

/**
 * Handles initial layout arrangement of nodes.
 * Waits for vis.js hierarchical layout to complete, then:
 * - Shifts connected nodes so roots align at ROOT_Y_IN_TOP_BAR
 * - Positions free nodes in a grid below the hierarchy
 */
export function useLayout({
  network,
  nodesDataSet,
  edgesDataSet,
}: UseLayoutProps): void {
  useEffect(() => {
    if (!network) return;

    const arrangeNodes = () => {
      const nodes = nodesDataSet.get();
      const edges = edgesDataSet.get();

      if (nodes.length === 0) return;

      // Get positions from vis.js hierarchical layout
      const positions = network.getPositions();

      // Calculate target Y for roots (in canvas coordinates)
      const targetRootY = domToCanvasY(network, ROOT_Y_IN_TOP_BAR);

      // Create calculator with current config
      const calculator = new LayoutCalculator({
        targetRootY,
        freeNodesTopMargin: FREE_NODES_TOP_MARGIN,
        freeNodesSpacing: FREE_NODES_SPACING,
      });

      // Calculate final layout
      const layout = calculator.calculate({ nodes, edges, positions });

      // Apply positions to nodes
      const updates = nodes.map((node) => {
        const pos = layout.positions[node.id];
        return updateNode(node, {
          x: pos?.x ?? 0,
          y: pos?.y ?? 0,
          isRoot: layout.rootIds.has(node.id) || node.isRoot,
        });
      });

      nodesDataSet.update(updates);
    };

    // Wait for hierarchical layout to complete
    network.once("stabilized", arrangeNodes);

    // Also run after a short delay in case stabilized doesn't fire
    const timeoutId = setTimeout(arrangeNodes, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [network, nodesDataSet, edgesDataSet]);
}
