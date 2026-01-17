import { useEffect } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import {
  FREE_NODES_TOP_MARGIN,
  FREE_NODES_SPACING,
  FREE_NODES_PER_ROW,
} from "../config";

interface UseLayoutProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
}

const ROOT_TOP_PADDING = 50;

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
      allEdges.forEach((edge) => {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
      });

      // Separate free nodes from connected nodes
      const freeNodes = allNodes.filter((node) => !connectedNodeIds.has(node.id));
      const connectedNodes = allNodes.filter((node) => connectedNodeIds.has(node.id));

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

      // Calculate how much to shift all nodes to put roots at top
      const canvas = network.getViewPosition();
      const scale = network.getScale();
      const containerHeight = (network as unknown as { body: { container: HTMLElement } }).body.container.clientHeight;

      // Target Y position for roots (in canvas coordinates)
      // We want roots to be near the top of the visible area
      const targetRootY = canvas.y - (containerHeight / 2 / scale) + ROOT_TOP_PADDING / scale;
      const yShift = targetRootY - hierarchyTop;

      // Shift all connected nodes
      const connectedUpdates: VisNode[] = connectedNodes.map((node) => ({
        id: node.id,
        label: node.label,
        x: positions[node.id].x,
        y: positions[node.id].y + yShift,
      }));

      // Position free nodes in a grid below the shifted hierarchy
      const newHierarchyBottom = hierarchyBottom + yShift;
      const freeNodesStartY = newHierarchyBottom + FREE_NODES_TOP_MARGIN;
      const totalWidth = (Math.min(freeNodes.length, FREE_NODES_PER_ROW) - 1) * FREE_NODES_SPACING;
      const startX = -totalWidth / 2;

      const freeUpdates: VisNode[] = freeNodes.map((node, index) => {
        const row = Math.floor(index / FREE_NODES_PER_ROW);
        const col = index % FREE_NODES_PER_ROW;

        return {
          id: node.id,
          label: node.label,
          x: startX + col * FREE_NODES_SPACING,
          y: freeNodesStartY + row * FREE_NODES_SPACING,
        };
      });

      // Apply all updates
      nodesDataSet.update([...connectedUpdates, ...freeUpdates]);

      // Move view to show roots at top
      setTimeout(() => {
        const updatedPositions = network.getPositions();

        // Find the new bounds
        let minY = Infinity;
        let maxY = -Infinity;
        let minX = Infinity;
        let maxX = -Infinity;

        allNodes.forEach((node) => {
          const pos = updatedPositions[node.id];
          if (pos) {
            if (pos.y < minY) minY = pos.y;
            if (pos.y > maxY) maxY = pos.y;
            if (pos.x < minX) minX = pos.x;
            if (pos.x > maxX) maxX = pos.x;
          }
        });

        const centerX = (minX + maxX) / 2;
        const containerWidth = (network as unknown as { body: { container: HTMLElement } }).body.container.clientWidth;

        // Calculate scale to fit width, but position so roots are at top
        const newScale = Math.min(1, containerWidth / (maxX - minX + 200));

        network.moveTo({
          position: { x: centerX, y: minY + (containerHeight / 2 / newScale) - ROOT_TOP_PADDING / newScale },
          scale: newScale,
          animation: { duration: 300, easingFunction: "easeInOutQuad" },
        });
      }, 50);
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
