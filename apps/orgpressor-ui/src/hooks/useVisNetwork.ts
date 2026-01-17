import { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone";
import type { Options } from "vis-network";
import type { PersonNode, HierarchyEdge, VisNode, VisEdge } from "../types";

interface UseVisNetworkProps {
  containerRef: React.RefObject<HTMLDivElement>;
  nodes: PersonNode[];
  edges: HierarchyEdge[];
  options: Options;
}

interface UseVisNetworkResult {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
}

export function useVisNetwork({
  containerRef,
  nodes,
  edges,
  options,
}: UseVisNetworkProps): UseVisNetworkResult {
  const [network, setNetwork] = useState<Network | null>(null);
  const nodesDataSetRef = useRef<DataSet<VisNode>>(new DataSet<VisNode>());
  const edgesDataSetRef = useRef<DataSet<VisEdge>>(new DataSet<VisEdge>());

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize datasets
    const visNodes = new DataSet<VisNode>(
      nodes.map((node) => ({
        id: node.id,
        label: node.label,
      }))
    );
    nodesDataSetRef.current = visNodes;

    const visEdges = new DataSet<VisEdge>(
      edges.map((edge) => ({
        id: `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
      }))
    );
    edgesDataSetRef.current = visEdges;

    // Create network
    const networkInstance = new Network(
      containerRef.current,
      { nodes: visNodes, edges: visEdges },
      options
    );
    setNetwork(networkInstance);

    return () => {
      networkInstance.destroy();
      setNetwork(null);
    };
  }, [containerRef, nodes, edges, options]);

  return {
    network,
    nodesDataSet: nodesDataSetRef.current,
    edgesDataSet: edgesDataSetRef.current,
  };
}
