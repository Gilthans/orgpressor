import type { Network } from "vis-network/standalone";

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
