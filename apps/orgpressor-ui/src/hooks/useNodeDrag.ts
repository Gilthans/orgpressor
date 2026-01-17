import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge, DragState } from "../types";
import {
  RUBBER_BAND_FACTOR,
  SNAP_OUT_THRESHOLD,
  HIGHLIGHT_COLOR,
  DEFAULT_NODE_COLOR,
  TOP_BAR_HEIGHT,
  networkOptions,
} from "../config";

// Get layout settings from config for positioning snapped nodes
const hierarchicalConfig = networkOptions.layout?.hierarchical as { levelSeparation?: number; nodeSpacing?: number } | undefined;
const LEVEL_SEPARATION = hierarchicalConfig?.levelSeparation ?? 100;
const NODE_SPACING = hierarchicalConfig?.nodeSpacing ?? 150;

// Check if two bounding boxes overlap
function boxesOverlap(
  a: { top: number; left: number; right: number; bottom: number },
  b: { top: number; left: number; right: number; bottom: number }
): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

// Get IDs of nodes that are part of the hierarchy (have edges or are roots)
function getSnappedNodeIds(
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): Set<string> {
  const snappedIds = new Set<string>();

  // Add nodes with edges
  edgesDataSet.get().forEach((edge) => {
    snappedIds.add(edge.from);
    snappedIds.add(edge.to);
  });

  // Add root nodes (even if they have no edges)
  nodesDataSet.get().forEach((node) => {
    if (node.isRoot) {
      snappedIds.add(node.id);
    }
  });

  return snappedIds;
}

// Check if a node is free (not part of hierarchy)
function isNodeFree(
  nodeId: string,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): boolean {
  const node = nodesDataSet.get(nodeId);
  if (node?.isRoot) return false;

  const connectedEdges = edgesDataSet.get({
    filter: (edge) => edge.from === nodeId || edge.to === nodeId,
  });
  return connectedEdges.length === 0;
}

interface UseNodeDragProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
  onTopBarHighlight?: (highlighted: boolean) => void;
}

export function useNodeDrag({
  network,
  nodesDataSet,
  edgesDataSet,
  onTopBarHighlight,
}: UseNodeDragProps): void {
  const dragState = useRef<DragState | null>(null);

  useEffect(() => {
    if (!network) return;

    const handleDragStart = (params: { nodes: (string | number)[] }) => {
      if (params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      const positions = network.getPositions([nodeId]);

      // Check if node is free (no edges and not a root)
      const isFree = isNodeFree(nodeId, nodesDataSet, edgesDataSet);

      dragState.current = {
        nodeId,
        originalX: positions[nodeId].x,
        originalY: positions[nodeId].y,
        snappedOut: isFree,
        highlightedNodeId: null,
        isOverTopBar: false,
      };
    };

    const handleDragging = (params: {
      nodes: (string | number)[];
      pointer: { canvas: { x: number; y: number } };
    }) => {
      if (!dragState.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragState.current.nodeId) return;

      const pointer = params.pointer.canvas;
      const { originalY, snappedOut } = dragState.current;

      if (snappedOut) {
        // Node is snapped out - move freely
        nodesDataSet.update({
          id: nodeId,
          label: nodesDataSet.get(nodeId)?.label || "",
          x: pointer.x,
          y: pointer.y,
        });

        // Check for overlap with snapped nodes FIRST (takes priority over top bar)
        const draggedBox = network.getBoundingBox(nodeId);
        const snappedIds = getSnappedNodeIds(nodesDataSet, edgesDataSet);
        let newHighlightedId: string | null = null;

        for (const snappedId of snappedIds) {
          const snappedBox = network.getBoundingBox(snappedId);
          if (boxesOverlap(draggedBox, snappedBox)) {
            newHighlightedId = snappedId;
            break;
          }
        }

        const prevHighlightedId = dragState.current.highlightedNodeId;

        // Reset previous node highlight if it changed
        if (prevHighlightedId && prevHighlightedId !== newHighlightedId) {
          const prevNode = nodesDataSet.get(prevHighlightedId);
          if (prevNode) {
            nodesDataSet.update({
              id: prevHighlightedId,
              label: prevNode.label,
              color: DEFAULT_NODE_COLOR,
            } as VisNode);
          }
        }

        // Apply new node highlight
        if (newHighlightedId && newHighlightedId !== prevHighlightedId) {
          const targetNode = nodesDataSet.get(newHighlightedId);
          if (targetNode) {
            nodesDataSet.update({
              id: newHighlightedId,
              label: targetNode.label,
              color: HIGHLIGHT_COLOR,
            } as VisNode);
          }
        }

        dragState.current.highlightedNodeId = newHighlightedId;

        // If overlapping a node, turn off top bar highlight and skip top bar check
        if (newHighlightedId) {
          if (dragState.current.isOverTopBar) {
            dragState.current.isOverTopBar = false;
            onTopBarHighlight?.(false);
          }
          return;
        }

        // No node overlap - check if over top bar zone
        const container = (network as unknown as { body: { container: HTMLElement } }).body.container;
        const canvasToDOM = network.canvasToDOM({ x: pointer.x, y: pointer.y });
        const containerRect = container.getBoundingClientRect();
        const domY = canvasToDOM.y - containerRect.top;

        const isOverTopBar = domY < TOP_BAR_HEIGHT;

        // Update top bar highlight
        if (isOverTopBar !== dragState.current.isOverTopBar) {
          dragState.current.isOverTopBar = isOverTopBar;
          onTopBarHighlight?.(isOverTopBar);
        }

        return;
      }

      // Calculate distance from original position
      const yOffset = pointer.y - originalY;
      const distance = Math.abs(yOffset);

      if (distance > SNAP_OUT_THRESHOLD) {
        // Capture all node positions before modifying edges
        const allNodeIds = nodesDataSet.get().map((n) => n.id);
        const allPositions = network.getPositions(allNodeIds);

        // Snap out! Remove edges connected to this node
        const connectedEdges = edgesDataSet.get({
          filter: (edge) => edge.from === nodeId || edge.to === nodeId,
        });
        connectedEdges.forEach((edge) => edgesDataSet.remove(edge.id));

        // Clear isRoot if this was a root node
        const node = nodesDataSet.get(nodeId);
        if (node?.isRoot) {
          nodesDataSet.update({
            id: nodeId,
            label: node.label,
            isRoot: false,
          });
        }

        // Restore all node positions (except the dragged node)
        const positionUpdates = allNodeIds
          .filter((id) => id !== nodeId)
          .map((id) => ({
            id,
            label: nodesDataSet.get(id)?.label || "",
            x: allPositions[id].x,
            y: allPositions[id].y,
          }));
        nodesDataSet.update(positionUpdates);

        dragState.current.snappedOut = true;

        // Move dragged node freely to pointer position
        nodesDataSet.update({
          id: nodeId,
          label: nodesDataSet.get(nodeId)?.label || "",
          x: pointer.x,
          y: pointer.y,
        });
      } else {
        // Rubber band effect
        const rubberBandY = originalY + yOffset * RUBBER_BAND_FACTOR;

        nodesDataSet.update({
          id: nodeId,
          label: nodesDataSet.get(nodeId)?.label || "",
          x: pointer.x,
          y: rubberBandY,
        });
      }
    };

    const handleDragEnd = (params: { nodes: (string | number)[] }) => {
      if (!dragState.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragState.current.nodeId) return;

      const { snappedOut, highlightedNodeId, isOverTopBar } = dragState.current;

      // Reset top bar highlight
      if (isOverTopBar) {
        onTopBarHighlight?.(false);
      }

      // Reset node highlight if any
      if (highlightedNodeId) {
        const highlightedNode = nodesDataSet.get(highlightedNodeId);
        if (highlightedNode) {
          nodesDataSet.update({
            id: highlightedNodeId,
            label: highlightedNode.label,
            color: DEFAULT_NODE_COLOR,
          } as VisNode);
        }
      }

      if (!snappedOut) {
        // Snap back to original Y
        const currentPos = network.getPositions([nodeId])[nodeId];
        nodesDataSet.update({
          id: nodeId,
          label: nodesDataSet.get(nodeId)?.label || "",
          x: currentPos.x,
          y: dragState.current.originalY,
        });
      } else if (isOverTopBar) {
        // Free node dropped in top bar - make it a root
        const allNodeIds = nodesDataSet.get().map((n) => n.id);
        const allPositions = network.getPositions(allNodeIds);

        // Find existing roots to position new root to their right
        const existingRoots = nodesDataSet.get().filter((n) => n.isRoot);
        let newRootX = 0;

        if (existingRoots.length > 0) {
          // Find the rightmost root
          let maxX = -Infinity;
          existingRoots.forEach((root) => {
            const rootPos = allPositions[root.id];
            if (rootPos && rootPos.x > maxX) {
              maxX = rootPos.x;
            }
          });
          newRootX = maxX + NODE_SPACING;
        }

        // Get the Y position of existing roots, or calculate centered in top bar
        let rootY = 0;
        if (existingRoots.length > 0) {
          const firstRootPos = allPositions[existingRoots[0].id];
          if (firstRootPos) {
            rootY = firstRootPos.y;
          }
        } else {
          // No existing roots - position centered in top bar
          const topBarCenterInCanvas = network.DOMtoCanvas({ x: 0, y: TOP_BAR_HEIGHT / 2 });
          rootY = topBarCenterInCanvas.y;
        }

        // Mark as root and position
        nodesDataSet.update({
          id: nodeId,
          label: nodesDataSet.get(nodeId)?.label || "",
          x: newRootX,
          y: rootY,
          isRoot: true,
        });
      } else if (highlightedNodeId) {
        // Free node dropped on a snapped node - create parent-child edge
        // Capture all node positions before adding edge (vis.js will recalculate layout)
        const allNodeIds = nodesDataSet.get().map((n) => n.id);
        const allPositions = network.getPositions(allNodeIds);

        // Get parent position for placing the new child
        const parentPos = allPositions[highlightedNodeId];

        // Find existing children of this parent
        const existingChildren = edgesDataSet
          .get({ filter: (edge) => edge.from === highlightedNodeId })
          .map((edge) => edge.to);

        // Calculate X position: to the right of existing siblings, or below parent if no siblings
        let newChildX = parentPos.x;
        if (existingChildren.length > 0) {
          // Find the rightmost sibling
          let maxX = -Infinity;
          existingChildren.forEach((childId) => {
            const childPos = allPositions[childId];
            if (childPos && childPos.x > maxX) {
              maxX = childPos.x;
            }
          });
          newChildX = maxX + NODE_SPACING;
        }

        // Add the edge
        const newEdgeId = `${highlightedNodeId}-${nodeId}`;
        edgesDataSet.add({
          id: newEdgeId,
          from: highlightedNodeId,
          to: nodeId,
        });

        // Restore all existing node positions (except the newly snapped node)
        const positionUpdates = allNodeIds
          .filter((id) => id !== nodeId)
          .map((id) => ({
            id,
            label: nodesDataSet.get(id)?.label || "",
            x: allPositions[id].x,
            y: allPositions[id].y,
          }));

        // Position the newly snapped node below its parent (and to right of siblings if any)
        positionUpdates.push({
          id: nodeId,
          label: nodesDataSet.get(nodeId)?.label || "",
          x: newChildX,
          y: parentPos.y + LEVEL_SEPARATION,
        });

        nodesDataSet.update(positionUpdates);
      }

      dragState.current = null;
    };

    network.on("dragStart", handleDragStart);
    network.on("dragging", handleDragging);
    network.on("dragEnd", handleDragEnd);

    return () => {
      network.off("dragStart", handleDragStart);
      network.off("dragging", handleDragging);
      network.off("dragEnd", handleDragEnd);
    };
  }, [network, nodesDataSet, edgesDataSet, onTopBarHighlight]);
}
