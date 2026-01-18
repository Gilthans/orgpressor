import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import { ROOT_Y_IN_TOP_BAR } from "../config";
import { findRootNodesMinY, getNetworkContainer } from "../utils/network";

interface UseInitialViewPositionProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
  onScaleChange?: (scale: number) => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;

/**
 * Handles initial view positioning after layout stabilizes.
 * Positions the view so that:
 * - Content fits horizontally (calculates appropriate scale)
 * - Root nodes appear at ROOT_Y_IN_TOP_BAR from the top of the viewport
 */
export function useInitialViewPosition({
  network,
  nodesDataSet,
  edgesDataSet,
  onScaleChange,
}: UseInitialViewPositionProps): void {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!network) return;

    const container = getNetworkContainer(network);

    /**
     * Calculate the viewY that positions roots at ROOT_Y_IN_TOP_BAR from top.
     */
    const calculateViewYForRoots = (scale: number): number => {
      const rootMinY = findRootNodesMinY(network, nodesDataSet, edgesDataSet);
      if (rootMinY === undefined) return 0;

      const containerHeight = container.clientHeight;
      // Formula: viewY where roots appear at ROOT_Y_IN_TOP_BAR from top
      return rootMinY - (ROOT_Y_IN_TOP_BAR - containerHeight / 2) / scale;
    };

    /**
     * Position the view so roots appear at the correct position.
     * Calculates scale to fit content width.
     */
    const positionView = () => {
      const allNodes = nodesDataSet.get();
      const positions = network.getPositions();

      // Find X bounds
      let minX = Infinity;
      let maxX = -Infinity;

      allNodes.forEach((node) => {
        const pos = positions[node.id];
        if (pos) {
          if (pos.x < minX) minX = pos.x;
          if (pos.x > maxX) maxX = pos.x;
        }
      });

      if (minX === Infinity) return; // No nodes

      const centerX = (minX + maxX) / 2;

      // Calculate scale to fit width
      const containerWidth = container.clientWidth;
      let newScale = Math.min(1, containerWidth / (maxX - minX + 200));
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // Position view with roots at top
      const viewY = calculateViewYForRoots(newScale);

      network.moveTo({
        position: { x: centerX, y: viewY },
        scale: newScale,
        animation: false,
      });

      onScaleChange?.(newScale);
    };

    const handleInitialLayout = () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      // Small delay to ensure all node positions are finalized
      setTimeout(positionView, 50);
    };

    // Listen for layout stabilization
    network.once("stabilized", handleInitialLayout);

    // Also trigger after a delay in case stabilized doesn't fire
    const initTimeoutId = setTimeout(handleInitialLayout, 150);

    return () => {
      clearTimeout(initTimeoutId);
      isInitialized.current = false;
    };
  }, [network, nodesDataSet, edgesDataSet, onScaleChange]);
}
