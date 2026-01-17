import { useEffect, useRef } from "react";
import { Network, DataSet } from "vis-network/standalone";
import type { PersonNode, HierarchyEdge } from "../types";

interface OrgGraphProps {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
}

interface VisNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
}

interface VisEdge {
  id: string;
  from: string;
  to: string;
}

const RUBBER_BAND_FACTOR = 0.15;
const SNAP_OUT_THRESHOLD = 150;

export function OrgGraph({ nodes, edges: initialEdges }: OrgGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDataSetRef = useRef<DataSet<VisNode> | null>(null);
  const edgesDataSetRef = useRef<DataSet<VisEdge> | null>(null);
  const dragState = useRef<{
    nodeId: string;
    originalX: number;
    originalY: number;
    snappedOut: boolean;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const visNodes = new DataSet<VisNode>(
      nodes.map((node) => ({
        id: node.id,
        label: node.label,
      }))
    );
    nodesDataSetRef.current = visNodes;

    const visEdges = new DataSet<VisEdge>(
      initialEdges.map((edge) => ({
        id: `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
      }))
    );
    edgesDataSetRef.current = visEdges;

    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: "UD",
          sortMethod: "directed",
          levelSeparation: 100,
          nodeSpacing: 150,
        },
      },
      nodes: {
        shape: "box",
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        font: { size: 14 },
        color: {
          background: "#e3f2fd",
          border: "#1976d2",
          highlight: { background: "#bbdefb", border: "#1565c0" },
        },
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        color: "#666",
        smooth: {
          enabled: true,
          type: "cubicBezier",
          forceDirection: "vertical",
          roundness: 0.5,
        },
      },
      physics: {
        enabled: false,
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
      },
    };

    const network = new Network(
      containerRef.current,
      { nodes: visNodes, edges: visEdges },
      options
    );
    networkRef.current = network;

    // Capture original position on drag start
    network.on("dragStart", (params) => {
      if (params.nodes.length === 1) {
        const nodeId = params.nodes[0] as string;
        const positions = network.getPositions([nodeId]);

        // Check if node has any edges - if not, it's already free
        const connectedEdges = visEdges.get({
          filter: (edge) => edge.from === nodeId || edge.to === nodeId,
        });
        const isAlreadyFree = connectedEdges.length === 0;

        dragState.current = {
          nodeId,
          originalX: positions[nodeId].x,
          originalY: positions[nodeId].y,
          snappedOut: isAlreadyFree,
        };
      }
    });

    // Apply rubber band effect during drag, or free movement if snapped out
    network.on("dragging", (params) => {
      if (!dragState.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragState.current.nodeId) return;

      const pointer = params.pointer.canvas;
      const { originalY, snappedOut } = dragState.current;

      if (snappedOut) {
        // Node is snapped out - move freely
        visNodes.update({
          id: nodeId,
          label: visNodes.get(nodeId)?.label || "",
          x: pointer.x,
          y: pointer.y,
        });
        return;
      }

      // Calculate distance from original position
      const yOffset = pointer.y - originalY;
      const distance = Math.abs(yOffset);

      if (distance > SNAP_OUT_THRESHOLD) {
        // Snap out! Remove edges connected to this node
        const connectedEdges = visEdges.get({
          filter: (edge) => edge.from === nodeId || edge.to === nodeId,
        });
        connectedEdges.forEach((edge) => visEdges.remove(edge.id));

        dragState.current.snappedOut = true;

        // Move node freely
        visNodes.update({
          id: nodeId,
          label: visNodes.get(nodeId)?.label || "",
          x: pointer.x,
          y: pointer.y,
        });
      } else {
        // Rubber band effect
        const rubberBandY = originalY + yOffset * RUBBER_BAND_FACTOR;

        visNodes.update({
          id: nodeId,
          label: visNodes.get(nodeId)?.label || "",
          x: pointer.x,
          y: rubberBandY,
        });
      }
    });

    // Snap back to original Y on drag end (unless snapped out)
    network.on("dragEnd", (params) => {
      if (!dragState.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragState.current.nodeId) return;

      if (!dragState.current.snappedOut) {
        // Snap back to original Y
        const currentPos = network.getPositions([nodeId])[nodeId];
        visNodes.update({
          id: nodeId,
          label: visNodes.get(nodeId)?.label || "",
          x: currentPos.x,
          y: dragState.current.originalY,
        });
      }

      dragState.current = null;
    });

    return () => {
      network.destroy();
    };
  }, [nodes, initialEdges]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
