import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import {
  ROOT_Y_IN_TOP_BAR,
  FREE_NODES_TOP_MARGIN,
  FREE_NODES_SPACING,
} from "../config";
import { domToCanvasY, getNetworkContainer } from "../utils/network";
import { LayoutCalculator } from "../utils/layout";

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

    const positionView = () => {
      const nodes = nodesDataSet.get();
      const edges = edgesDataSet.get();

      if (nodes.length === 0) return;

      // Get current positions (already arranged by useLayout)
      const positions = network.getPositions();

      // Calculate target Y for roots (in canvas coordinates)
      const targetRootY = domToCanvasY(network, ROOT_Y_IN_TOP_BAR);

      // Create calculator to get bounds
      const calculator = new LayoutCalculator({
        targetRootY,
        freeNodesTopMargin: FREE_NODES_TOP_MARGIN,
        freeNodesSpacing: FREE_NODES_SPACING,
      });

      const layout = calculator.calculate({ nodes, edges, positions });
      const { bounds } = layout;
      const centerX = (bounds.minX + bounds.maxX) / 2;

      // Calculate scale to fit width
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const contentWidth = bounds.maxX - bounds.minX + 200;
      let newScale = Math.min(1, containerWidth / contentWidth);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // Calculate viewY so roots appear at ROOT_Y_IN_TOP_BAR from viewport top
      const viewY = bounds.minY - (ROOT_Y_IN_TOP_BAR - containerHeight / 2) / newScale;

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

      // Small delay to ensure useLayout has applied positions
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
