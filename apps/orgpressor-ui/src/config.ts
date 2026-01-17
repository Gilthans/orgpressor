import type { Options } from "vis-network";

export const RUBBER_BAND_FACTOR = 0.15;
export const SNAP_OUT_THRESHOLD = 150;

// Layout settings for free nodes
export const FREE_NODES_TOP_MARGIN = 150;
export const FREE_NODES_SPACING = 120;
export const FREE_NODES_PER_ROW = 5;

export const networkOptions: Options = {
  layout: {
    hierarchical: {
      enabled: true,
      direction: "UD",
      sortMethod: "directed",
      levelSeparation: 100,
      nodeSpacing: 150,
    },
  },
  nodes: {
    shape: "box",
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    font: { size: 14 },
    color: {
      background: "#e3f2fd",
      border: "#1976d2",
      highlight: { background: "#bbdefb", border: "#1565c0" },
    },
  },
  edges: {
    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    color: "#666",
    smooth: {
      enabled: true,
      type: "cubicBezier",
      forceDirection: "vertical",
      roundness: 0.5,
    },
  },
  physics: {
    enabled: false,
  },
  interaction: {
    dragNodes: true,
    dragView: false, // Disabled - custom X-only panning in useViewConstraints
    zoomView: false, // Disabled - custom zoom that keeps top fixed in useViewConstraints
  },
};
