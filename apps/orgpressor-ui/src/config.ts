import type { Options } from "vis-network";

export const RUBBER_BAND_FACTOR = 0.15;
export const SNAP_OUT_THRESHOLD = 150;

// Highlight color for potential parent nodes during drag
export const HIGHLIGHT_COLOR = {
  background: "#c8e6c9",
  border: "#388e3c",
};

// Default node color (for resetting after highlight)
export const DEFAULT_NODE_COLOR = {
  background: "#e3f2fd",
  border: "#1976d2",
};

// Top bar configuration for creating root nodes
export const TOP_BAR_HEIGHT = 60;
export const TOP_BAR_COLOR = {
  background: "rgba(227, 242, 253, 0.3)",
  border: "#1976d2",
  highlightBackground: "rgba(200, 230, 201, 0.5)",
  highlightBorder: "#388e3c",
};

// Layout settings for free nodes
export const FREE_NODES_TOP_MARGIN = 150;
export const FREE_NODES_SPACING = 120;
export const FREE_NODES_PER_ROW = 5;

// Hierarchical layout settings (also used in networkOptions below)
export const LEVEL_SEPARATION = 100;
export const NODE_SPACING = 150;

// Position roots centered vertically inside the top bar
export const ROOT_Y_IN_TOP_BAR = TOP_BAR_HEIGHT / 2;

export const networkOptions: Options = {
  layout: {
    hierarchical: {
      enabled: true,
      direction: "UD",
      sortMethod: "directed",
      levelSeparation: LEVEL_SEPARATION,
      nodeSpacing: NODE_SPACING,
      // @ts-expect-error shakeTowards is valid but not in type definitions
      shakeTowards: "roots",
    },
  },
  nodes: {
    shape: "box",
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    font: {
      size: 14,
      multi: "html", // Enable HTML-style formatting for multi-line labels
    },
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
    dragView: true, // Disabled - custom X-only panning in useViewConstraints
    zoomView: true, // Disabled - custom zoom that keeps top fixed in useViewConstraints
  },
};
