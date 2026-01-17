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

const RUBBER_BAND_FACTOR = 0.15;

export function OrgGraph({ nodes, edges }: OrgGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDataSetRef = useRef<DataSet<VisNode> | null>(null);
  const dragStartPos = useRef<{ nodeId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const visNodes = new DataSet<VisNode>(
      nodes.map((node) => ({
        id: node.id,
        label: node.label,
      }))
    );
    nodesDataSetRef.current = visNodes;

    const visEdges = new DataSet(
      edges.map((edge) => ({
        id: `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
      }))
    );

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
        dragStartPos.current = {
          nodeId,
          x: positions[nodeId].x,
          y: positions[nodeId].y,
        };
      }
    });

    // Apply rubber band effect during drag
    network.on("dragging", (params) => {
      if (!dragStartPos.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragStartPos.current.nodeId) return;

      const pointer = params.pointer.canvas;
      const originalY = dragStartPos.current.y;

      // Rubber band: node moves freely in X, but Y is constrained
      const yOffset = pointer.y - originalY;
      const rubberBandY = originalY + yOffset * RUBBER_BAND_FACTOR;

      visNodes.update({
        id: nodeId,
        label: visNodes.get(nodeId)?.label || "",
        x: pointer.x,
        y: rubberBandY,
      });
    });

    // Snap back to original Y on drag end
    network.on("dragEnd", (params) => {
      if (!dragStartPos.current || params.nodes.length !== 1) return;

      const nodeId = params.nodes[0] as string;
      if (nodeId !== dragStartPos.current.nodeId) return;

      const currentPos = network.getPositions([nodeId])[nodeId];

      visNodes.update({
        id: nodeId,
        label: visNodes.get(nodeId)?.label || "",
        x: currentPos.x,
        y: dragStartPos.current.y,
      });

      dragStartPos.current = null;
    });

    return () => {
      network.destroy();
    };
  }, [nodes, edges]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
