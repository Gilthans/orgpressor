import { useEffect, useRef } from "react";
import type { Network } from "vis-network/standalone";

interface UseViewConstraintsProps {
  network: Network | null;
  onScaleChange?: (scale: number) => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const ZOOM_SPEED = 0.001;

export function useViewConstraints({ network, onScaleChange }: UseViewConstraintsProps): void {
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lockedY = useRef(0);

  useEffect(() => {
    if (!network) return;

    const container = (network as unknown as { body: { container: HTMLElement } }).body.container;
    const containerHeight = container.clientHeight;

    // Report initial scale
    onScaleChange?.(network.getScale());

    // Listen for scale changes from any source (including useLayout)
    const handleZoom = () => {
      onScaleChange?.(network.getScale());
    };
    network.on("zoom", handleZoom);

    // Calculate the top Y position in canvas coordinates
    const getTopY = (viewY: number, scale: number) => {
      return viewY - containerHeight / 2 / scale;
    };

    // Calculate the view Y needed to keep a specific top Y
    const getViewYForTop = (topY: number, scale: number) => {
      return topY + containerHeight / 2 / scale;
    };

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

    // --- Zooming (keep top Y fixed) ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentScale = network.getScale();
      const currentPos = network.getViewPosition();

      // Calculate the current top Y position
      const topY = getTopY(currentPos.y, currentScale);

      // Calculate new scale
      const delta = -e.deltaY * ZOOM_SPEED;
      let newScale = currentScale * (1 + delta);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // Calculate the new view Y to keep top Y fixed
      const newViewY = getViewYForTop(topY, newScale);

      network.moveTo({
        position: {
          x: currentPos.x,
          y: newViewY,
        },
        scale: newScale,
        animation: false,
      });

      onScaleChange?.(newScale);
    };

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
      network.off("zoom", handleZoom);
    };
  }, [network, onScaleChange]);
}
