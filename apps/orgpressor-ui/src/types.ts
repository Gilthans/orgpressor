export interface PersonNode {
  id: string;
  label: string;
}

export interface HierarchyEdge {
  from: string;
  to: string;
}

export interface VisNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  isRoot?: boolean;
}

export interface VisEdge {
  id: string;
  from: string;
  to: string;
}

export interface DragState {
  nodeId: string;
  originalX: number;
  originalY: number;
  snappedOut: boolean;
  highlightedNodeId: string | null;
  isOverTopBar: boolean;
  descendantIds: string[];
  relativePositions: Record<string, { dx: number; dy: number }>;
}
