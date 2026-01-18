import {useCallback, useEffect, useMemo } from "react";
import type { Network } from "vis-network/standalone";
import { getNetworkContainer } from "../utils/network";

interface ViewBounds {
  minY?: number; // Minimum Y in canvas coordinates (can't pan above this)
  maxY?: number; // Minimum Y in canvas coordinates (can't pan above this)
  minX?: number; // Minimum Y in canvas coordinates (can't pan above this)
  maxX?: number; // Minimum Y in canvas coordinates (can't pan above this)
}

interface UseViewConstraintsProps {
  network: Network | null;
  /** Returns the current view bounds. Called during pan/zoom to get up-to-date constraints. */
  viewBounds: ViewBounds;
}
/**
 * Enforces view constraints for pan and zoom operations.
 * This hook is generic - it knows nothing about nodes or graph structure.
 * It simply enforces the bounds provided by getViewBounds.
 *
 * Key behaviors:
 * - Custom panning: X is free, Y is clamped by minY
 * - Custom zooming: Keeps top of view fixed, respects minY constraint
 * - Resize handling: Preserves user's intended scale
 */
export function useViewConstraints({
  network,
  viewBounds,
}: UseViewConstraintsProps): void {
  const actualViewBounds = useMemo(() => {
    return {
      minY: viewBounds.minY ?? -Infinity,
      maxY: viewBounds.maxY ?? Infinity,
      minX: viewBounds.minX ?? -Infinity,
      maxX: viewBounds.maxX ?? Infinity,
    };
  }, [viewBounds]);
  const snapToBounds = useCallback(() => {
    if (!network) return;
    const container = getNetworkContainer(network);
    const currentPos = network.getViewPosition();
    const boundingRectDom = container.getBoundingClientRect();
    const canvasTopLeft = network.DOMtoCanvas({x: boundingRectDom.left, y: boundingRectDom.top});
    const canvasBottomRight = network.DOMtoCanvas({x: boundingRectDom.right, y: boundingRectDom.bottom});

    let changeY = 0;
    if (canvasTopLeft.y < actualViewBounds.minY) {
      changeY = canvasTopLeft.y - actualViewBounds.minY;
    } else if (canvasBottomRight.y > actualViewBounds.maxY) {
      changeY = - (canvasBottomRight.y - actualViewBounds.maxY);
    }

    let changeX = 0;
    if (canvasTopLeft.x < actualViewBounds.minX) {
      changeX = canvasTopLeft.x - actualViewBounds.minX;
    } else if (canvasBottomRight.x > actualViewBounds.maxX) {
      changeX = - (canvasBottomRight.x - actualViewBounds.maxX);
    }
    if (changeY === 0 && changeX === 0) return;
    const newY = currentPos.y - changeY;
    const newX = currentPos.x - changeX;
    network.moveTo({
      position: {
        x: newX,
        y: newY,
      },
      animation: false,
    });
  }, [network]);
  useEffect(() => {
    if (!network) return;
    network.on("beforeDrawing", snapToBounds);
    network.on("dragging", snapToBounds);
    network.on("resize", snapToBounds);
    return () => {
      network.off("beforeDrawing", snapToBounds);
      network.off("dragging", snapToBounds);
      network.off("resize", snapToBounds);
    }
  }, [network]);
}
