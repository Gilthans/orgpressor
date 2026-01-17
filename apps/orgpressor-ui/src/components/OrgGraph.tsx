import { useRef, useState, useCallback } from "react";
import type { PersonNode, HierarchyEdge } from "../types";
import { networkOptions } from "../config";
import { useVisNetwork, useNodeDrag, useLayout, useViewConstraints } from "../hooks";
import { TopBar } from "./TopBar";

interface OrgGraphProps {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
}

export function OrgGraph({ nodes, edges }: OrgGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTopBarHighlighted, setIsTopBarHighlighted] = useState(false);

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

  const handleTopBarHighlight = useCallback((highlighted: boolean) => {
    setIsTopBarHighlighted(highlighted);
  }, []);

  useNodeDrag({
    network,
    nodesDataSet,
    edgesDataSet,
    onTopBarHighlight: handleTopBarHighlight,
  });

  useViewConstraints({ network });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <TopBar isHighlighted={isTopBarHighlighted} />
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
