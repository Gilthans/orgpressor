import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge, DragState } from "../types";
import {
  RUBBER_BAND_FACTOR,
  SNAP_OUT_THRESHOLD,
  HIGHLIGHT_COLOR,
  DEFAULT_NODE_COLOR,
  TOP_BAR_HEIGHT,
  LEVEL_SEPARATION,
  NODE_SPACING,
} from "../config";
import {
  getSnappedNodeIds,
  isNodeFree,
  getChildNodeIds,
  getConnectedEdges,
} from "../utils/hierarchy";
import {
  captureAllPositions,
  findRightmostX,
  createPositionUpdates,
  boxesOverlap,
} from "../utils/positions";
import { canvasToDOMY, domToCanvasY } from "../utils/network";

interface UseNodeDragProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
  onTopBarHighlight?: (highlighted: boolean) => void;
}

// --- Highlight Helpers ---

function setNodeHighlight(
  nodesDataSet: DataSet<VisNode>,
  nodeId: string,
  color: { background: string; border: string }
): void {
  const node = nodesDataSet.get(nodeId);
  if (node) {
    nodesDataSet.update({
      id: nodeId,
      label: node.label,
      color,
    } as VisNode);
  }
}

function resetNodeHighlight(nodesDataSet: DataSet<VisNode>, nodeId: string): void {
  setNodeHighlight(nodesDataSet, nodeId, DEFAULT_NODE_COLOR);
}

// --- Drag End Handlers ---

function handleSnapBack(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  nodeId: string,
  originalY: number
): void {
  const currentPos = network.getPositions([nodeId])[nodeId];
  nodesDataSet.update({
    id: nodeId,
    label: nodesDataSet.get(nodeId)?.label || "",
    x: currentPos.x,
    y: originalY,
  });
}

function handleCreateRoot(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  nodeId: string
): void {
  const positions = captureAllPositions(network, nodesDataSet);
  const existingRoots = nodesDataSet.get().filter((n) => n.isRoot);
  const existingRootIds = existingRoots.map((r) => r.id);

  // Calculate X position: to the right of existing roots
  let newRootX = 0;
  if (existingRoots.length > 0) {
    newRootX = findRightmostX(existingRootIds, positions) + NODE_SPACING;
  }

  // Calculate Y position: same as existing roots, or centered in top bar
  let rootY = 0;
  if (existingRoots.length > 0) {
    const firstRootPos = positions[existingRoots[0].id];
    if (firstRootPos) {
      rootY = firstRootPos.y;
    }
  } else {
    rootY = domToCanvasY(network, TOP_BAR_HEIGHT / 2);
  }

  nodesDataSet.update({
    id: nodeId,
    label: nodesDataSet.get(nodeId)?.label || "",
    x: newRootX,
    y: rootY,
    isRoot: true,
  });
}

function handleSnapToParent(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>,
  nodeId: string,
  parentId: string
): void {
  const positions = captureAllPositions(network, nodesDataSet);
  const parentPos = positions[parentId];

  // Find existing children to position new child to their right
  const existingChildIds = getChildNodeIds(parentId, edgesDataSet);
  let newChildX = parentPos.x;
  if (existingChildIds.length > 0) {
    newChildX = findRightmostX(existingChildIds, positions) + NODE_SPACING;
  }

  // Add the edge
  edgesDataSet.add({
    id: `${parentId}-${nodeId}`,
    from: parentId,
    to: nodeId,
  });

  // Restore all existing node positions
  const positionUpdates = createPositionUpdates(nodesDataSet, positions, [nodeId]);

  // Position the newly snapped node below its parent
  positionUpdates.push({
    id: nodeId,
    label: nodesDataSet.get(nodeId)?.label || "",
    x: newChildX,
    y: parentPos.y + LEVEL_SEPARATION,
  });

  nodesDataSet.update(positionUpdates);
}

// --- Main Hook ---

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
        handleFreeDragging(nodeId, pointer);
      } else {
        handleConnectedDragging(nodeId, pointer, originalY);
      }
    };

    const handleFreeDragging = (
      nodeId: string,
      pointer: { x: number; y: number }
    ) => {
      // Move node freely
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

      // Update node highlight
      const prevHighlightedId = dragState.current!.highlightedNodeId;
      if (prevHighlightedId && prevHighlightedId !== newHighlightedId) {
        resetNodeHighlight(nodesDataSet, prevHighlightedId);
      }
      if (newHighlightedId && newHighlightedId !== prevHighlightedId) {
        setNodeHighlight(nodesDataSet, newHighlightedId, HIGHLIGHT_COLOR);
      }
      dragState.current!.highlightedNodeId = newHighlightedId;

      // If overlapping a node, turn off top bar highlight
      if (newHighlightedId) {
        if (dragState.current!.isOverTopBar) {
          dragState.current!.isOverTopBar = false;
          onTopBarHighlight?.(false);
        }
        return;
      }

      // No node overlap - check if over top bar zone
      const domY = canvasToDOMY(network, pointer.y);
      const isOverTopBar = domY < TOP_BAR_HEIGHT;

      if (isOverTopBar !== dragState.current!.isOverTopBar) {
        dragState.current!.isOverTopBar = isOverTopBar;
        onTopBarHighlight?.(isOverTopBar);
      }
    };

    const handleConnectedDragging = (
      nodeId: string,
      pointer: { x: number; y: number },
      originalY: number
    ) => {
      const yOffset = pointer.y - originalY;
      const distance = Math.abs(yOffset);

      if (distance > SNAP_OUT_THRESHOLD) {
        // Snap out from hierarchy
        const positions = captureAllPositions(network, nodesDataSet);

        // Remove edges connected to this node
        const connectedEdges = getConnectedEdges(nodeId, edgesDataSet);
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

        // Restore all other node positions
        const positionUpdates = createPositionUpdates(nodesDataSet, positions, [nodeId]);
        nodesDataSet.update(positionUpdates);

        dragState.current!.snappedOut = true;

        // Move dragged node to pointer position
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

      const { snappedOut, highlightedNodeId, isOverTopBar, originalY } = dragState.current;

      // Reset highlights
      if (isOverTopBar) {
        onTopBarHighlight?.(false);
      }
      if (highlightedNodeId) {
        resetNodeHighlight(nodesDataSet, highlightedNodeId);
      }

      // Handle the drop based on state
      if (!snappedOut) {
        handleSnapBack(network, nodesDataSet, nodeId, originalY);
      } else if (isOverTopBar) {
        handleCreateRoot(network, nodesDataSet, nodeId);
      } else if (highlightedNodeId) {
        handleSnapToParent(network, nodesDataSet, edgesDataSet, nodeId, highlightedNodeId);
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
