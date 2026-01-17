import { useRef } from "react";
import type { PersonNode, HierarchyEdge } from "../types";
import { networkOptions } from "../config";
import { useVisNetwork, useNodeDrag, useLayout, useViewConstraints } from "../hooks";

interface OrgGraphProps {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
}

export function OrgGraph({ nodes, edges }: OrgGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { network, nodesDataSet, edgesDataSet } = useVisNetwork({
    containerRef,
    nodes,
    edges,
    options: networkOptions,
  });

  useLayout({
    network,
    nodesDataSet,
    edgesDataSet,
  });

  useNodeDrag({
    network,
    nodesDataSet,
    edgesDataSet,
  });

  useViewConstraints({ network });

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
