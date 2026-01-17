import { useEffect, useRef } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge, DragState } from "../types";
import { RUBBER_BAND_FACTOR, SNAP_OUT_THRESHOLD } from "../config";

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

      if (!dragState.current.snappedOut) {
        // Snap back to original Y
        const currentPos = network.getPositions([nodeId])[nodeId];
        nodesDataSet.update({
          id: nodeId,
          label: nodesDataSet.get(nodeId)?.label || "",
          x: currentPos.x,
          y: dragState.current.originalY,
        });
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
