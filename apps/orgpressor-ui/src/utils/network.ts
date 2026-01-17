import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import { ROOT_Y_IN_TOP_BAR } from "../config";
import { getRootNodeIds } from "./hierarchy";

/**
 * Get the container element from a vis-network instance
 */
export function getNetworkContainer(network: Network): HTMLElement {
  return (network as unknown as { body: { container: HTMLElement } }).body.container;
}

/**
 * Convert canvas coordinates to DOM coordinates relative to container
 */
export function canvasToDOMY(network: Network, canvasY: number): number {
  const container = getNetworkContainer(network);
  const canvasToDOM = network.canvasToDOM({ x: 0, y: canvasY });
  const containerRect = container.getBoundingClientRect();
  return canvasToDOM.y - containerRect.top;
}

/**
 * Convert DOM Y coordinate (relative to container top) to canvas Y
 */
export function domToCanvasY(network: Network, domY: number): number {
  return network.DOMtoCanvas({ x: 0, y: domY }).y;
}

/**
 * Find the minimum Y coordinate of root nodes (nodes at the top of the hierarchy).
 * Returns undefined if no roots are found.
 */
export function findRootNodesMinY(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): number | undefined {
  const positions = network.getPositions();
  const rootIds = getRootNodeIds(edgesDataSet);

  let minY = Infinity;

  // Check nodes that are roots by hierarchy (no incoming edges)
  rootIds.forEach((id) => {
    const pos = positions[id];
    if (pos && pos.y < minY) {
      minY = pos.y;
    }
  });

  // Also check nodes explicitly marked as isRoot
  nodesDataSet.get().forEach((node) => {
    if (node.isRoot) {
      const pos = positions[node.id];
      if (pos && pos.y < minY) {
        minY = pos.y;
      }
    }
  });

  return minY === Infinity ? undefined : minY;
}

/**
 * Position the view so that a given canvas Y coordinate appears at ROOT_Y_IN_TOP_BAR in DOM.
 * This is the core function for keeping roots visible in the top bar.
 *
 * The math: DOM_Y = containerHeight/2 + (canvasY - viewY) * scale
 * Solving for viewY when DOM_Y = ROOT_Y_IN_TOP_BAR:
 *   viewY = canvasY + (containerHeight/2 - ROOT_Y_IN_TOP_BAR) / scale
 */
export function positionViewForTopY(
  network: Network,
  topCanvasY: number,
  options?: { animate?: boolean }
): void {
  const container = getNetworkContainer(network);
  const containerHeight = container.clientHeight;
  const scale = network.getScale();
  const currentPos = network.getViewPosition();

  const viewY = topCanvasY + (containerHeight / 2 - ROOT_Y_IN_TOP_BAR) / scale;

  network.moveTo({
    position: { x: currentPos.x, y: viewY },
    scale: scale,
    animation: options?.animate ? { duration: 300, easingFunction: "easeInOutQuad" } : false,
  });
}

/**
 * Position the view so root nodes appear at ROOT_Y_IN_TOP_BAR in DOM.
 * Combines findRootNodesMinY and positionViewForTopY for convenience.
 */
export function positionViewForRoots(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>,
  options?: { animate?: boolean }
): void {
  const minY = findRootNodesMinY(network, nodesDataSet, edgesDataSet);
  if (minY !== undefined) {
    positionViewForTopY(network, minY, options);
  }
}

/**
 * Check if roots are currently at the correct DOM Y position (within tolerance).
 */
export function areRootsAtCorrectPosition(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>,
  tolerance: number = 1
): boolean {
  const minY = findRootNodesMinY(network, nodesDataSet, edgesDataSet);
  if (minY === undefined) return true; // No roots, nothing to check

  // Calculate where minY currently appears in DOM coordinates
  const currentDomY = canvasToDOMY(network, minY);

  return Math.abs(currentDomY - ROOT_Y_IN_TOP_BAR) <= tolerance;
}

/**
 * Ensure roots are at the correct position, correcting if necessary.
 * Returns true if a correction was made.
 */
export function ensureRootsAtCorrectPosition(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): boolean {
  if (areRootsAtCorrectPosition(network, nodesDataSet, edgesDataSet)) {
    return false;
  }

  positionViewForRoots(network, nodesDataSet, edgesDataSet);
  return true;
}
