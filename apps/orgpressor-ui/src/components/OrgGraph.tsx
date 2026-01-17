import { useRef, useState, useCallback, useEffect } from "react";
import { formatNodeLabel, updateNode } from "../types";
import type { PersonNode, HierarchyEdge, NodeMetadata, GraphChangeData } from "../types";
import { networkOptions } from "../config";
import { useVisNetwork, useNodeDrag, useLayout, useViewConstraints } from "../hooks";
import { extractGraphState } from "../utils/graphState";
import { TopBar } from "./TopBar";
import { EditNodeDialog } from "./EditNodeDialog";

interface OrgGraphProps {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
  onChange?: (data: GraphChangeData) => void;
  selectedNodeId?: string | null;
  onSelectedNodeChange?: (nodeId: string | null) => void;
}

export function OrgGraph({
  nodes,
  edges,
  onChange,
  selectedNodeId,
  onSelectedNodeChange,
}: OrgGraphProps) {
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

  // Handle node selection changes from vis-network
  useEffect(() => {
    if (!network) return;

    const handleClick = (params: { nodes: (string | number)[] }) => {
      const newSelectedId = params.nodes.length === 1 ? (params.nodes[0] as string) : null;
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
