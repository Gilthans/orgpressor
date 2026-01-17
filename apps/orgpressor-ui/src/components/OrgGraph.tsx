import { useRef, useState, useCallback, useEffect } from "react";
import { formatNodeLabel, updateNode } from "../types";
import type { PersonNode, HierarchyEdge, NodeMetadata } from "../types";
import { networkOptions } from "../config";
import { useVisNetwork, useNodeDrag, useLayout, useViewConstraints } from "../hooks";
import { TopBar } from "./TopBar";
import { EditNodeDialog } from "./EditNodeDialog";

interface OrgGraphProps {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
}

export function OrgGraph({ nodes, edges }: OrgGraphProps) {
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

  useNodeDrag({
    network,
    nodesDataSet,
    edgesDataSet,
    onTopBarHighlight: handleTopBarHighlight,
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
      }
      setEditingNodeId(null);
    },
    [editingNodeId, nodesDataSet]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const editingNode = editingNodeId ? nodesDataSet.get(editingNodeId) : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <TopBar isHighlighted={isTopBarHighlighted} scale={scale} />
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
