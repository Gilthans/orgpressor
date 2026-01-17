import type { Network } from "vis-network";
import type { DataSet } from "vis-data";
import { useRef, useState, useCallback, useEffect } from "react";
import { formatNodeLabel, updateNode } from "../types";
import type {
  PersonNode,
  HierarchyEdge,
  NodeMetadata,
  GraphChangeData,
  VisNode,
  VisEdge,
  GraphAccessor,
  NodeStateInfo,
  EdgeStateInfo,
} from "../types";
import { networkOptions } from "../config";
import { useVisNetwork, useNodeDrag, useLayout, useViewConstraints } from "../hooks";
import { extractGraphState } from "../utils/graphState";
import { TopBar } from "./TopBar";
import { EditNodeDialog } from "./EditNodeDialog";


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
      return edgesDataSet.get().map((edge) => ({
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
  onReady?: (accessor: GraphAccessor) => void;
}

export function OrgGraph({ nodes, edges, onChange, onReady }: OrgGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTopBarHighlighted, setIsTopBarHighlighted] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

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

  const notifyChange = useCallback(() => {
    if (onChange) {
      onChange(extractGraphState(nodesDataSet, edgesDataSet));
    }
  }, [onChange, nodesDataSet, edgesDataSet]);

  useNodeDrag({
    network,
    nodesDataSet,
    edgesDataSet,
    scale,
    onTopBarHighlight: handleTopBarHighlight,
    onHierarchyChange: notifyChange,
  });

  useViewConstraints({ network, onScaleChange: setScale });

  // Handle double-click to edit node metadata
  useEffect(() => {
    if (!network) return;

    const handleDoubleClick = (params: { nodes: (string | number)[] }) => {
      if (params.nodes.length === 1) {
        setEditingNodeId(params.nodes[0] as string);
      }
    };

    network.on("doubleClick", handleDoubleClick);
    return () => {
      network.off("doubleClick", handleDoubleClick);
    };
  }, [network]);

  const handleSaveMetadata = useCallback(
    (metadata: NodeMetadata) => {
      if (!editingNodeId) return;

      const node = nodesDataSet.get(editingNodeId);
      if (node) {
        nodesDataSet.update(
          updateNode(node, {
            label: formatNodeLabel(node.name, metadata),
            metadata,
          })
        );
        notifyChange();
      }
      setEditingNodeId(null);
    },
    [editingNodeId, nodesDataSet, notifyChange]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const editingNode = editingNodeId ? nodesDataSet.get(editingNodeId) : null;

  // Create accessor and notify consumers when ready
  useEffect(() => {
    if (network && nodesDataSet && edgesDataSet) {
      const accessor = createGraphAccessor(network, nodesDataSet, edgesDataSet);
      onReady?.(accessor);
    }
  }, [network, nodesDataSet, edgesDataSet, onReady]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <TopBar isHighlighted={isTopBarHighlighted} scale={scale} />
      <div ref={containerRef} style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }} />
      {editingNode && (
        <EditNodeDialog
          nodeName={editingNode.name}
          metadata={editingNode.metadata || {}}
          onSave={handleSaveMetadata}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}
