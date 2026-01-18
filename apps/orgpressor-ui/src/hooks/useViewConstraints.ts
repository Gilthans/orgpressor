import { useEffect, useRef } from "react";
import type { Network } from "vis-network/standalone";
import { getNetworkContainer } from "../utils/network";

interface ViewBounds {
  minY?: number; // Minimum Y in canvas coordinates (can't pan above this)
}

interface UseViewConstraintsProps {
  network: Network | null;
  /** Returns the current view bounds. Called during pan/zoom to get up-to-date constraints. */
  getViewBounds: (scale: number) => ViewBounds;
  onScaleChange?: (scale: number) => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const ZOOM_SPEED = 0.001;

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
  getViewBounds,
  onScaleChange,
}: UseViewConstraintsProps): void {
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // Track the user's intended scale (only updated by explicit zoom actions)
  const intendedScale = useRef(1);

  useEffect(() => {
    if (!network) return;

    const container = getNetworkContainer(network);

    // Initialize intended scale
    intendedScale.current = network.getScale();
    onScaleChange?.(intendedScale.current);

    /**
     * Get the minimum viewY that respects the bounds constraint.
     */
    const getMinViewY = (scale: number): number => {
      const bounds = getViewBounds(scale);
      return bounds.minY ?? -Infinity;
    };

    // --- Panning (X free, Y clamped at top) ---
    const handleMouseDown = (e: MouseEvent) => {
      const nodeAt = network.getNodeAt({ x: e.offsetX, y: e.offsetY });
      if (nodeAt) return;

      isDragging.current = true;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      container.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastX.current;
      const deltaY = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;

      const currentPos = network.getViewPosition();
      const scale = network.getScale();

      // Calculate new Y position and clamp to minimum
      const newY = currentPos.y - deltaY / scale;
      const minViewY = getMinViewY(scale);
      const clampedY = Math.max(minViewY, newY);

      network.moveTo({
        position: {
          x: currentPos.x - deltaX / scale,
          y: clampedY,
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

    // --- Zooming (keep top of view fixed, update intended scale, respect top limit) ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentScale = network.getScale();
      const currentPos = network.getViewPosition();
      const containerHeight = container.clientHeight;

      // Calculate new scale
      const delta = -e.deltaY * ZOOM_SPEED;
      let newScale = currentScale * (1 + delta);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // Check if we're currently at the top limit
      const currentMinViewY = getMinViewY(currentScale);
      const atTopLimit = Math.abs(currentPos.y - currentMinViewY) < 1;

      let newViewY: number;
      if (atTopLimit) {
        // If at top limit, stay at top limit at new scale
        newViewY = getMinViewY(newScale);
      } else {
        // Otherwise, keep the same top Y position in view
        const topY = currentPos.y - containerHeight / 2 / currentScale;
        newViewY = topY + containerHeight / 2 / newScale;

        // Still clamp to minimum viewY
        const minViewY = getMinViewY(newScale);
        newViewY = Math.max(minViewY, newViewY);
      }

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

      // Redraw canvas for new dimensions
      network.redraw();

      // Restore user's intended scale and respect minY constraint
      const minViewY = getMinViewY(intendedScale.current);

      network.moveTo({
        position: { x: network.getViewPosition().x, y: minViewY },
        scale: intendedScale.current,
        animation: false,
      });

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
  }, [network, getViewBounds, onScaleChange]);
}
