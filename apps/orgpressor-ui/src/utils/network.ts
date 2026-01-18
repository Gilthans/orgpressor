import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
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
  const container = getNetworkContainer(network);
  const containerRect = container.getBoundingClientRect();
  // DOMtoCanvas expects window-relative coordinates, so add container top
  return network.DOMtoCanvas({ x: 0, y: domY + containerRect.top }).y;
}

/**
 * Find the minimum Y coordinate of root nodes (nodes at the top of the hierarchy).
 * Returns undefined if no roots are found.
 * Excludes the special top bar node.
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
