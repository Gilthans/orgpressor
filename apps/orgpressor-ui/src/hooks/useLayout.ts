import { useEffect } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import { updateNode } from "../types";
import type { VisNode, VisEdge } from "../types";
import {
  FREE_NODES_TOP_MARGIN,
  FREE_NODES_SPACING,
  FREE_NODES_PER_ROW,
  ROOT_Y_IN_TOP_BAR,
} from "../config";
import { getRootNodeIds } from "../utils/hierarchy";
import {
  getNetworkContainer,
  domToCanvasY,
  ensureRootsAtCorrectPosition,
} from "../utils/network";

interface UseLayoutProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
}

export function useLayout({
  network,
  nodesDataSet,
  edgesDataSet,
}: UseLayoutProps): void {
  useEffect(() => {
    if (!network) return;

    const container = getNetworkContainer(network);

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

      // Calculate how much to shift all nodes to put roots inside the top bar
      const containerHeight = container.clientHeight;

      // Target Y position for roots (in canvas coordinates) - centered in top bar
      const targetRootY = domToCanvasY(network, ROOT_Y_IN_TOP_BAR);
      const yShift = targetRootY - hierarchyTop;

      // Shift all connected nodes and mark roots
      const connectedUpdates: VisNode[] = connectedNodes.map((node) =>
        updateNode(node, {
          x: positions[node.id]?.x ?? 0,
          y: (positions[node.id]?.y ?? 0) + yShift,
          isRoot: rootNodeIds.has(node.id) || node.isRoot,
        })
      );

      // Position free nodes in a grid below the shifted hierarchy
      const newHierarchyBottom = hierarchyBottom + yShift;
      const freeNodesStartY = newHierarchyBottom + FREE_NODES_TOP_MARGIN;
      const totalWidth =
        (Math.min(freeNodes.length, FREE_NODES_PER_ROW) - 1) * FREE_NODES_SPACING;
      const startX = -totalWidth / 2;

      const freeUpdates: VisNode[] = freeNodes.map((node, index) => {
        const row = Math.floor(index / FREE_NODES_PER_ROW);
        const col = index % FREE_NODES_PER_ROW;

        return updateNode(node, {
          x: startX + col * FREE_NODES_SPACING,
          y: freeNodesStartY + row * FREE_NODES_SPACING,
        });
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
        const containerWidth = container.clientWidth;

        // Calculate scale to fit width, but position so roots appear in top bar
        const newScale = Math.min(1, containerWidth / (maxX - minX + 200));

        // Position view so that minY (root level) appears at ROOT_Y_IN_TOP_BAR in DOM
        const viewY = minY + (containerHeight / 2 - ROOT_Y_IN_TOP_BAR) / newScale;

        network.moveTo({
          position: { x: centerX, y: viewY },
          scale: newScale,
          animation: { duration: 300, easingFunction: "easeInOutQuad" },
        });
      }, 50);
    };

    // Wait for hierarchical layout to complete, then arrange free nodes
    network.once("stabilized", arrangeNodes);

    // Also run on initial load after a short delay
    const timeoutId = setTimeout(arrangeNodes, 100);

    // Enforce invariant: roots must always be at ROOT_Y_IN_TOP_BAR in DOM
    // This runs after every vis-network render to correct any drift
    const enforceRootPosition = () => {
      ensureRootsAtCorrectPosition(network, nodesDataSet, edgesDataSet);
    };

    network.on("afterDrawing", enforceRootPosition);

    // Handle container resize
    let previousWidth = container.clientWidth;
    let previousHeight = container.clientHeight;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width: newWidth, height: newHeight } = entry.contentRect;

      // Skip if no actual size change or invalid dimensions
      if ((previousWidth === newWidth && previousHeight === newHeight) || newHeight === 0 || newWidth === 0) {
        return;
      }

      // Update canvas dimensions - this will trigger afterDrawing which enforces root position
      network.redraw();

      previousWidth = newWidth;
      previousHeight = newHeight;
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      network.off("afterDrawing", enforceRootPosition);
      resizeObserver.disconnect();
    };
  }, [network, nodesDataSet, edgesDataSet]);
}
