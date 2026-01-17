import { useRef, useState, useCallback, useEffect } from "react";
import type { Network } from "vis-network";
import type { DataSet } from "vis-data";
import type { PersonNode, HierarchyEdge, VisNode, VisEdge } from "../types";
import { networkOptions } from "../config";
import { useVisNetwork, useNodeDrag, useLayout, useViewConstraints } from "../hooks";
import { TopBar } from "./TopBar";

// Expose network for e2e testing
declare global {
  interface Window {
    __TEST_NETWORK__?: {
      network: Network;
      nodesDataSet: DataSet<VisNode>;
      edgesDataSet: DataSet<VisEdge>;
    };
  }
}

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

  // Expose network for e2e testing
  useEffect(() => {
    if (network && nodesDataSet && edgesDataSet) {
      window.__TEST_NETWORK__ = { network, nodesDataSet, edgesDataSet };
      return () => {
        delete window.__TEST_NETWORK__;
      };
    }
  }, [network, nodesDataSet, edgesDataSet]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <TopBar isHighlighted={isTopBarHighlighted} />
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
