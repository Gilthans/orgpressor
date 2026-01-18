import { useState, useCallback } from "react";
import type { Network, DataSet } from "vis-network/standalone";
import type { VisNode, VisEdge } from "../types";
import { useNodeDrag, useCanvasTopBar } from "../hooks";

interface HierarchicalNetworkEditorProps {
  network: Network | null;
  nodesDataSet: DataSet<VisNode>;
  edgesDataSet: DataSet<VisEdge>;
  topBarCanvasY: number;
  topBarHeight: number;
  onHierarchyChange?: () => void;
}

/**
 * Adds hierarchical editing behavior to a vis-network graph.
 * - Drag nodes to reparent them in the hierarchy
 * - Drop nodes in the top bar to make them roots
 * - Visual feedback when dragging over the top bar
 */
export function HierarchicalNetworkEditor({
  network,
  nodesDataSet,
  edgesDataSet,
  topBarCanvasY,
  topBarHeight,
  onHierarchyChange,
}: HierarchicalNetworkEditorProps) {
  const [isTopBarHighlighted, setIsTopBarHighlighted] = useState(false);

  const handleTopBarHighlight = useCallback((highlighted: boolean) => {
    setIsTopBarHighlighted(highlighted);
  }, []);

  useNodeDrag({
    network,
    nodesDataSet,
    edgesDataSet,
    onTopBarHighlight: handleTopBarHighlight,
    onHierarchyChange,
  });

  useCanvasTopBar({
    network,
    canvasTopY: topBarCanvasY,
    height: topBarHeight,
    isHighlighted: isTopBarHighlighted,
  });

  // This component doesn't render anything - it just adds behavior
  return null;
}
