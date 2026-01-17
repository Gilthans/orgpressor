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
  getParentEdge,
} from "../utils/hierarchy";
import {
  captureAllPositions,
  findRightmostX,
  createPositionUpdates,
  boxesOverlap,
} from "../utils/positions";
import { canvasToDOMY, domToCanvasY } from "../utils/network";
import {
  captureSubtree,
  createSubtreeMoveUpdates,
  getSubtreeNodeIds,
} from "../utils/subtree";

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
  nodesDataSet: DataSet<VisNode>,
  dragState: DragState,
  currentX: number
): void {
  const { originalX, originalY, subtree } = dragState;
  const xOffset = currentX - originalX;

  // Create updates with X offset applied but Y restored to original
  const updates = createSubtreeMoveUpdates(
    nodesDataSet,
    subtree,
    currentX,
    originalY
  );

  // Adjust descendant X positions to include the offset
  // (The root is already at currentX, descendants need offset from originalX)
  updates.forEach((update, index) => {
    if (index > 0) {
      // Skip root node, adjust descendants
      const rel = subtree.relativePositions[update.id];
      if (rel) {
        update.x = originalX + rel.dx + xOffset;
      }
    }
  });

  nodesDataSet.update(updates);
}

function handleCreateRoot(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  dragState: DragState
): void {
  const { subtree } = dragState;
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

  // Move subtree to root position
  const updates = createSubtreeMoveUpdates(
    nodesDataSet,
    subtree,
    newRootX,
    rootY,
    { isRoot: true }
  );

  nodesDataSet.update(updates);
}

function handleSnapToParent(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>,
  dragState: DragState,
  parentId: string
): void {
  const { subtree } = dragState;
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
    id: `${parentId}-${subtree.rootId}`,
    from: parentId,
    to: subtree.rootId,
  });

  // Calculate the new position for the dropped node
  const newNodeX = newChildX;
  const newNodeY = parentPos.y + LEVEL_SEPARATION;

  // Restore all existing node positions (excluding the subtree being moved)
  const subtreeIds = getSubtreeNodeIds(subtree);
  const positionUpdates = createPositionUpdates(
    nodesDataSet,
    positions,
    Array.from(subtreeIds)
  );

  // Add subtree move updates
  const subtreeUpdates = createSubtreeMoveUpdates(
    nodesDataSet,
    subtree,
    newNodeX,
    newNodeY
  );

  nodesDataSet.update([...positionUpdates, ...subtreeUpdates]);
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
      const isFree = isNodeFree(nodeId, nodesDataSet, edgesDataSet);
      const subtree = captureSubtree(network, edgesDataSet, nodeId);
      const positions = network.getPositions([nodeId]);

      dragState.current = {
        originalX: positions[nodeId].x,
        originalY: positions[nodeId].y,
        snappedOut: isFree,
        highlightedNodeId: null,
        isOverTopBar: false,
        subtree,
      };
    };

    const handleDragging = (params: {
      nodes: (string | number)[];
      pointer: { canvas: { x: number; y: number } };
    }) => {
      if (!dragState.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragState.current.subtree.rootId) return;

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
      const { subtree } = dragState.current!;

      // Move subtree freely
      const updates = createSubtreeMoveUpdates(
        nodesDataSet,
        subtree,
        pointer.x,
        pointer.y
      );
      nodesDataSet.update(updates);

      // Check for overlap with snapped nodes FIRST (takes priority over top bar)
      // Exclude the dragged subtree from potential drop targets
      const draggedBox = network.getBoundingBox(nodeId);
      const snappedIds = getSnappedNodeIds(nodesDataSet, edgesDataSet);
      const subtreeIds = getSubtreeNodeIds(subtree);
      let newHighlightedId: string | null = null;

      for (const snappedId of snappedIds) {
        // Skip nodes in the dragged subtree
        if (subtreeIds.has(snappedId)) continue;

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
      const { subtree } = dragState.current!;
      const yOffset = pointer.y - originalY;
      const distance = Math.abs(yOffset);

      if (distance > SNAP_OUT_THRESHOLD) {
        // Snap out from hierarchy - only remove the edge to parent, keep children connected
        const positions = captureAllPositions(network, nodesDataSet);

        // Only remove the edge where this node is the child (edge TO this node)
        const parentEdge = getParentEdge(nodeId, edgesDataSet);
        if (parentEdge) {
          edgesDataSet.remove(parentEdge.id);
        }

        // Clear isRoot if this was a root node
        const node = nodesDataSet.get(nodeId);
        if (node?.isRoot) {
          nodesDataSet.update({
            id: nodeId,
            label: node.label,
            isRoot: false,
          });
        }

        // Restore positions of nodes NOT in subtree
        const subtreeIds = getSubtreeNodeIds(subtree);
        const positionUpdates = createPositionUpdates(
          nodesDataSet,
          positions,
          Array.from(subtreeIds)
        );
        nodesDataSet.update(positionUpdates);

        dragState.current!.snappedOut = true;

        // Move subtree to pointer position
        const subtreeUpdates = createSubtreeMoveUpdates(
          nodesDataSet,
          subtree,
          pointer.x,
          pointer.y
        );
        nodesDataSet.update(subtreeUpdates);
      } else {
        // Rubber band effect - move entire subtree
        const rubberBandY = originalY + yOffset * RUBBER_BAND_FACTOR;
        const xOffset = pointer.x - dragState.current!.originalX;

        // For rubber band, we need custom positioning since Y is constrained
        const updates = createSubtreeMoveUpdates(
          nodesDataSet,
          subtree,
          pointer.x,
          rubberBandY
        );

        // Adjust descendant positions for the X offset
        updates.forEach((update, index) => {
          if (index > 0) {
            const rel = subtree.relativePositions[update.id];
            if (rel) {
              update.x = dragState.current!.originalX + xOffset + rel.dx;
            }
          }
        });

        nodesDataSet.update(updates);
      }
    };

    const handleDragEnd = (params: { nodes: (string | number)[] }) => {
      if (!dragState.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragState.current.subtree.rootId) return;

      const { snappedOut, highlightedNodeId, isOverTopBar } = dragState.current;

      // Reset highlights
      if (isOverTopBar) {
        onTopBarHighlight?.(false);
      }
      if (highlightedNodeId) {
        resetNodeHighlight(nodesDataSet, highlightedNodeId);
      }

      // Handle the drop based on state
      if (!snappedOut) {
        // Get current X position to preserve horizontal movement
        const currentPos = network.getPositions([nodeId])[nodeId];
        handleSnapBack(nodesDataSet, dragState.current, currentPos.x);
      } else if (isOverTopBar) {
        handleCreateRoot(network, nodesDataSet, dragState.current);
      } else if (highlightedNodeId) {
        handleSnapToParent(
          network,
          nodesDataSet,
          edgesDataSet,
          dragState.current,
          highlightedNodeId
        );
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
