import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import { TOP_BAR_HEIGHT, TOP_BAR_COLOR, ROOT_Y_IN_TOP_BAR } from "../config";
import { findRootNodesMinY } from "../utils/network";

interface UseCanvasTopBarProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
  isHighlighted: boolean;
}

// How far to extend the top bar horizontally (canvas units)
const TOP_BAR_HORIZONTAL_EXTENT = 10000;

/**
 * Draws the top bar directly on the vis.js canvas.
 * This makes it scroll with the canvas content rather than staying fixed.
 */
export function useCanvasTopBar({
  network,
  nodesDataSet,
  edgesDataSet,
  isHighlighted,
}: UseCanvasTopBarProps): void {
  // Use ref to track highlight state so the callback always has current value
  const isHighlightedRef = useRef(isHighlighted);
  isHighlightedRef.current = isHighlighted;

  useEffect(() => {
    if (!network) return;

    const drawTopBar = (ctx: CanvasRenderingContext2D) => {
      // Find where roots are positioned in canvas coordinates
      const rootMinY = findRootNodesMinY(network, nodesDataSet, edgesDataSet);

      // If no roots, use a default position based on where roots would be
      const rootCanvasY = rootMinY ?? 0;

      // Top bar extends from above the root to below it
      // Root is centered in the top bar, so:
      // - Top of bar: rootCanvasY - ROOT_Y_IN_TOP_BAR
      // - Bottom of bar: rootCanvasY + (TOP_BAR_HEIGHT - ROOT_Y_IN_TOP_BAR)
      const topBarTop = rootCanvasY - ROOT_Y_IN_TOP_BAR;
      const topBarBottom = rootCanvasY + (TOP_BAR_HEIGHT - ROOT_Y_IN_TOP_BAR);

      // Draw the background
      ctx.fillStyle = isHighlightedRef.current
        ? TOP_BAR_COLOR.highlightBackground
        : TOP_BAR_COLOR.background;
      ctx.fillRect(
        -TOP_BAR_HORIZONTAL_EXTENT,
        topBarTop,
        TOP_BAR_HORIZONTAL_EXTENT * 2,
        topBarBottom - topBarTop
      );

      // Draw the bottom border
      ctx.strokeStyle = isHighlightedRef.current
        ? TOP_BAR_COLOR.highlightBorder
        : TOP_BAR_COLOR.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-TOP_BAR_HORIZONTAL_EXTENT, topBarBottom);
      ctx.lineTo(TOP_BAR_HORIZONTAL_EXTENT, topBarBottom);
      ctx.stroke();
    };

    network.on("beforeDrawing", drawTopBar);

    return () => {
      network.off("beforeDrawing", drawTopBar);
    };
  }, [network, nodesDataSet, edgesDataSet]);

  // Force redraw when highlight state changes
  useEffect(() => {
    if (network) {
      network.redraw();
    }
  }, [network, isHighlighted]);
}
