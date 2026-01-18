// =============================================================================
// Config constants (must match src/config.ts)
// =============================================================================

export const TOP_BAR_HEIGHT = 60;
export const TOP_BAR_CENTER_Y = TOP_BAR_HEIGHT / 2;
export const SNAP_OUT_THRESHOLD = 150;

// Minimum spacing between roots to avoid accidental connections when creating multiple roots
export const ROOT_SPACING = 300;

// =============================================================================
// Viewport settings
// =============================================================================

export const VIEWPORT = {
  width: 1280,
  height: 720,
} as const;
