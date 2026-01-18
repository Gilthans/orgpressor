import type { Network, DataSet } from "vis-network/standalone";
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
import { networkOptions, TOP_BAR_NODE_ID } from "../config";
import { useVisNetwork, useNodeDrag, useLayout, useViewConstraints, useInitialViewPosition, useCanvasTopBar } from "../hooks";
import { extractGraphState } from "../utils/graphState";
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
      const nodes = nodesDataSet.get().filter((node) => node.id !== TOP_BAR_NODE_ID);
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
        .filter((edge) => edge.from !== TOP_BAR_NODE_ID && edge.to !== TOP_BAR_NODE_ID)
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
  const [isTopBarHighlighted, setIsTopBarHighlighted] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

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
    onTopBarHighlight: handleTopBarHighlight,
    onHierarchyChange: notifyChange,
  });

  useCanvasTopBar({
    network,
    canvasTopY: 0,
    height: 100,
    isHighlighted: isTopBarHighlighted,
  });

  useViewConstraints({
    network,
    viewBounds: { minY: 0 },
  });

  useInitialViewPosition({
    network,
    nodesDataSet,
    edgesDataSet,
  });

  // Handle double-click to edit node metadata
  useEffect(() => {
    if (!network) return;

    const handleDoubleClick = (params: { nodes: (string | number)[] }) => {
      if (params.nodes.length === 1) {
        const nodeId = params.nodes[0] as string;
        // Don't allow editing the top bar node
        if (nodeId !== TOP_BAR_NODE_ID) {
          setEditingNodeId(nodeId);
        }
      }
    };

    network.on("doubleClick", handleDoubleClick);
    return () => {
      network.off("doubleClick", handleDoubleClick);
    };
  }, [network]);

  // Handle node selection changes from vis-network
  useEffect(() => {
    if (!network) return;

    const handleClick = (params: { nodes: (string | number)[] }) => {
      const clickedNodeId = params.nodes.length === 1 ? (params.nodes[0] as string) : null;
      // Don't report selection of the top bar node
      const newSelectedId = clickedNodeId === TOP_BAR_NODE_ID ? null : clickedNodeId;
      onSelectedNodeChange?.(newSelectedId);
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
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
