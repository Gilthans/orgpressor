import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge, DragState } from "../types";
import {
  RUBBER_BAND_FACTOR,
  SNAP_OUT_THRESHOLD,
  HIGHLIGHT_COLOR,
  DEFAULT_NODE_COLOR,
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

// Get IDs of nodes that are part of the hierarchy (have edges)
function getSnappedNodeIds(edgesDataSet: DataSet<VisEdge>): Set<string> {
  const snappedIds = new Set<string>();
  edgesDataSet.get().forEach((edge) => {
    snappedIds.add(edge.from);
    snappedIds.add(edge.to);
  });
  return snappedIds;
}

interface UseNodeDragProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
}

export function useNodeDrag({
  network,
  nodesDataSet,
  edgesDataSet,
}: UseNodeDragProps): void {
  const dragState = useRef<DragState | null>(null);

  useEffect(() => {
    if (!network) return;

    const handleDragStart = (params: { nodes: (string | number)[] }) => {
      if (params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      const positions = network.getPositions([nodeId]);

      // Check if node has any edges - if not, it's already free
      const connectedEdges = edgesDataSet.get({
        filter: (edge) => edge.from === nodeId || edge.to === nodeId,
      });
      const isAlreadyFree = connectedEdges.length === 0;

      dragState.current = {
        nodeId,
        originalX: positions[nodeId].x,
        originalY: positions[nodeId].y,
        snappedOut: isAlreadyFree,
        highlightedNodeId: null,
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

        // Check for overlap with snapped nodes (potential parents)
        const draggedBox = network.getBoundingBox(nodeId);
        const snappedIds = getSnappedNodeIds(edgesDataSet);
        let newHighlightedId: string | null = null;

        for (const snappedId of snappedIds) {
          const snappedBox = network.getBoundingBox(snappedId);
          if (boxesOverlap(draggedBox, snappedBox)) {
            newHighlightedId = snappedId;
            break;
          }
        }

        const prevHighlightedId = dragState.current.highlightedNodeId;

        // Reset previous highlight if it changed
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

        // Apply new highlight
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

      const { snappedOut, highlightedNodeId } = dragState.current;

      // Reset highlight if any
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
  }, [network, nodesDataSet, edgesDataSet]);
}
