import { useEffect, useRef } from "react";
import { Network, DataSet } from "vis-network/standalone";
import type { PersonNode, HierarchyEdge } from "../types";

interface OrgGraphProps {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
}

export function OrgGraph({ nodes, edges }: OrgGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const visNodes = new DataSet(
      nodes.map((node) => ({
        id: node.id,
        label: node.label,
      }))
    );

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

    networkRef.current = new Network(
      containerRef.current,
      { nodes: visNodes, edges: visEdges },
      options
    );

    return () => {
      networkRef.current?.destroy();
    };
  }, [nodes, edges]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
