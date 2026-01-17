import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import { ROOT_Y_IN_TOP_BAR } from "../config";
import { findRootNodesMinY } from "../utils/network";

interface UseViewConstraintsProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
  onScaleChange?: (scale: number) => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const ZOOM_SPEED = 0.001;

/**
 * Manages view constraints: zoom, pan, and resize handling.
 *
 * Key invariants:
 * - User's zoom level (scale) is preserved across viewport resizes
 * - Roots stay at ROOT_Y_IN_TOP_BAR * scale in DOM coordinates
 * - Panning is X-axis only (Y is locked)
 */
export function useViewConstraints({
  network,
  nodesDataSet,
  edgesDataSet,
  onScaleChange,
}: UseViewConstraintsProps): void {
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lockedY = useRef(0);

  // Track the user's intended scale (only updated by explicit zoom actions)
  const intendedScale = useRef(1);

  useEffect(() => {
    if (!network) return;

    const container = (network as unknown as { body: { container: HTMLElement } }).body.container;

    // Initialize intended scale
    intendedScale.current = network.getScale();
    onScaleChange?.(intendedScale.current);

    // --- Panning (X-axis only) ---
    const handleMouseDown = (e: MouseEvent) => {
      const nodeAt = network.getNodeAt({ x: e.offsetX, y: e.offsetY });
      if (nodeAt) return;

      isDragging.current = true;
      lastX.current = e.clientX;
      lockedY.current = network.getViewPosition().y;
      container.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastX.current;
      lastX.current = e.clientX;

      const currentPos = network.getViewPosition();
      const scale = network.getScale();

      network.moveTo({
        position: {
          x: currentPos.x - deltaX / scale,
          y: lockedY.current,
        },
        animation: false,
      });
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        container.style.cursor = "default";
      }
    };

    const handleMouseLeave = () => {
      if (isDragging.current) {
        isDragging.current = false;
        container.style.cursor = "default";
      }
    };

    // --- Zooming (keep top of view fixed, update intended scale) ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentScale = network.getScale();
      const currentPos = network.getViewPosition();
      const containerHeight = container.clientHeight;

      // Calculate the current top Y position in canvas coordinates
      const topY = currentPos.y - containerHeight / 2 / currentScale;

      // Calculate new scale
      const delta = -e.deltaY * ZOOM_SPEED;
      let newScale = currentScale * (1 + delta);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // Calculate the new view Y to keep top Y fixed
      const newViewY = topY + containerHeight / 2 / newScale;

      network.moveTo({
        position: { x: currentPos.x, y: newViewY },
        scale: newScale,
        animation: false,
      });

      // Update intended scale (this is a user-initiated zoom)
      intendedScale.current = newScale;
      onScaleChange?.(newScale);
    };

    // --- Resize handling (preserve user's intended scale) ---
    let previousWidth = container.clientWidth;
    let previousHeight = container.clientHeight;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width: newWidth, height: newHeight } = entry.contentRect;

      // Skip if no actual size change or invalid dimensions
      if (
        (previousWidth === newWidth && previousHeight === newHeight) ||
        newHeight === 0 ||
        newWidth === 0
      ) {
        return;
      }

      // Find root position before any changes
      const rootMinY = findRootNodesMinY(network, nodesDataSet, edgesDataSet);

      // Redraw canvas for new dimensions
      network.redraw();

      // Restore user's intended scale and position roots correctly
      if (rootMinY !== undefined) {
        const targetDomY = ROOT_Y_IN_TOP_BAR * intendedScale.current;
        const viewY = rootMinY + (newHeight / 2 - targetDomY) / intendedScale.current;

        network.moveTo({
          position: { x: network.getViewPosition().x, y: viewY },
          scale: intendedScale.current,
          animation: false,
        });
      }

      previousWidth = newWidth;
      previousHeight = newHeight;
    });

    resizeObserver.observe(container);

    // Event listeners
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("wheel", handleWheel);
      resizeObserver.disconnect();
    };
  }, [network, nodesDataSet, edgesDataSet, onScaleChange]);
}
