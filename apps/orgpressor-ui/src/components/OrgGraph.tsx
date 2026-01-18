import type { Network, DataSet } from "vis-network/standalone";
import { useRef, useCallback, useEffect, useMemo } from "react";
import type {
  PersonNode,
  HierarchyEdge,
  GraphChangeData,
  VisNode,
  VisEdge,
  GraphAccessor,
  NodeStateInfo,
  EdgeStateInfo,
} from "../types";
import {
  networkOptions,
  FREE_NODES_TOP_MARGIN,
  FREE_NODES_SPACING, TOP_BAR_HEIGHT,
} from "../config";
import { useVisNetwork, useViewConstraints } from "../hooks";
import { extractGraphState, validateNoCycles, LayoutCalculator } from "../utils";
import { HierarchicalNetworkEditor } from "./HierarchicalNetworkEditor";


/**
 * Creates a GraphAccessor from vis-network internals.
 */
function createGraphAccessor(
  network: Network,
  nodesDataSet: DataSet<VisNode>,
  edgesDataSet: DataSet<VisEdge>
): GraphAccessor {
  return {
    getNodes(): NodeStateInfo[] {
      const nodes = nodesDataSet.get();
      const positions = network.getPositions();

      return nodes.map((node) => {
        const canvasPos = positions[node.id] || { x: 0, y: 0 };
        const domPos = network.canvasToDOM(canvasPos);
        return {
          id: node.id,
          label: node.label,
          isRoot: node.isRoot || false,
          position: { x: Math.round(domPos.x), y: Math.round(domPos.y) },
        };
      });
    },

    getEdges(): EdgeStateInfo[] {
      return edgesDataSet
        .get()
        .map((edge) => ({
          id: edge.id,
          from: edge.from,
          to: edge.to,
          dashes: edge.dashes || false,
        }));
    },
  };
}

interface OrgGraphProps {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
  onChange?: (data: GraphChangeData) => void;
  selectedNodeId?: string | null;
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onReady?: (accessor: GraphAccessor) => void;
}

export function OrgGraph({
  nodes,
  edges,
  onChange,
  selectedNodeId,
  onSelectedNodeChange,
  onReady
}: OrgGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Validate that edges form a valid DAG (no cycles)
  validateNoCycles(edges);

  const { network, nodesDataSet, edgesDataSet } = useVisNetwork({
    containerRef,
    nodes,
    edges,
    options: networkOptions,
  });

  // Create layout calculator once datasets are available
  const layoutCalculator = useMemo(() => {
    return new LayoutCalculator({
      targetRootY: TOP_BAR_HEIGHT / 2,
      freeNodesTopMargin: FREE_NODES_TOP_MARGIN,
      freeNodesSpacing: FREE_NODES_SPACING,
      nodesDataSet,
      edgesDataSet,
    });
  }, [nodesDataSet, edgesDataSet]);

  // Apply initial layout when network is ready
  useEffect(() => {
    if (!network) return;
    layoutCalculator.reapplyLayout(network, true);
  }, [network, layoutCalculator]);

  const notifyChange = useCallback(() => {
    if (onChange) {
      onChange(extractGraphState(nodesDataSet, edgesDataSet));
    }
  }, [onChange, nodesDataSet, edgesDataSet]);

  useViewConstraints({
    network,
    viewBounds: { minY: 0 },
  });

  // Handle node selection changes from vis-network
  useEffect(() => {
    if (!network) return;

    const handleClick = (params: { nodes: (string | number)[] }) => {
      const clickedNodeId = params.nodes.length === 1 ? (params.nodes[0] as string) : null;
      onSelectedNodeChange?.(clickedNodeId);
    };

    network.on("click", handleClick);
    return () => {
      network.off("click", handleClick);
    };
  }, [network, onSelectedNodeChange]);

  // Sync external selectedNodeId to vis-network
  useEffect(() => {
    if (!network) return;

    const currentSelection = network.getSelectedNodes();
    const currentSelectedId = currentSelection.length === 1 ? currentSelection[0] : null;

    if (selectedNodeId !== currentSelectedId) {
      if (selectedNodeId) {
        network.selectNodes([selectedNodeId]);
      } else {
        network.unselectAll();
      }
    }
  }, [network, selectedNodeId]);

  // Create accessor and notify consumers when ready
  useEffect(() => {
    if (network && nodesDataSet && edgesDataSet) {
      const accessor = createGraphAccessor(network, nodesDataSet, edgesDataSet);
      onReady?.(accessor);
    }
  }, [network, nodesDataSet, edgesDataSet, onReady]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <HierarchicalNetworkEditor
        network={network}
        nodesDataSet={nodesDataSet}
        edgesDataSet={edgesDataSet}
        topBarCanvasY={0}
        topBarHeight={TOP_BAR_HEIGHT}
        onHierarchyChange={notifyChange}
      />
    </div>
  );
}
