import { Page, Locator } from "@playwright/test";

// =============================================================================
// Config constants (must match src/config.ts)
// =============================================================================

export const TOP_BAR_HEIGHT = 60;
export const TOP_BAR_CENTER_Y = TOP_BAR_HEIGHT / 2;
export const SNAP_OUT_THRESHOLD = 150;

// =============================================================================
// Viewport settings
// =============================================================================

export const VIEWPORT = {
  width: 1280,
  height: 720,
} as const;

// =============================================================================
// Node positions (observed from 1280x720 viewport layout)
// =============================================================================

type NodePosition = { x: number; y: number };

// Hierarchy structure:
//   John Smith (root)
//   ├── Sarah Johnson
//   │   ├── Emily Davis
//   │   └── Robert Wilson
//   └── Michael Chen
//       ├── Lisa Anderson
//       └── David Martinez
// Free nodes: Jennifer Taylor, James Brown, Maria Garcia, William Lee, Amanda White

export const NODE_POSITIONS = {
  // Root (level 0)
  "John Smith": { x: 370, y: 30 },

  // Level 1
  "Sarah Johnson": { x: 225, y: 130 },
  "Michael Chen": { x: 515, y: 130 },

  // Level 2 (Sarah's children)
  "Emily Davis": { x: 150, y: 230 },
  "Robert Wilson": { x: 300, y: 230 },

  // Level 2 (Michael's children)
  "Lisa Anderson": { x: 445, y: 230 },
  "David Martinez": { x: 590, y: 230 },

  // Free nodes row (y ≈ 407)
  "Jennifer Taylor": { x: 625, y: 407 },
  "James Brown": { x: 745, y: 407 },
  "Maria Garcia": { x: 860, y: 407 },
  "William Lee": { x: 980, y: 407 },
  "Amanda White": { x: 1100, y: 407 },
} as const satisfies Record<string, NodePosition>;

export type NodeName = keyof typeof NODE_POSITIONS;

// Node IDs (from src/data/nodes.json)
export const NODE_IDS: Record<NodeName, string> = {
  "John Smith": "1",
  "Sarah Johnson": "2",
  "Michael Chen": "3",
  "Emily Davis": "4",
  "Robert Wilson": "5",
  "Lisa Anderson": "6",
  "David Martinez": "7",
  "Jennifer Taylor": "8",
  "James Brown": "9",
  "Maria Garcia": "10",
  "William Lee": "11",
  "Amanda White": "12",
};

// =============================================================================
// Locators
// =============================================================================

export function getCanvas(page: Page): Locator {
  return page.locator("canvas");
}

// =============================================================================
// Setup helpers
// =============================================================================

export async function setupPage(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await waitForNetwork(page);
}

export async function waitForNetwork(page: Page): Promise<void> {
  await page.waitForSelector("canvas");
  // Wait for initial layout to stabilize by polling until canvas stops changing
  await waitForCanvasStable(page, 1000);
}

/**
 * Poll until canvas stops changing (stable layout).
 * Used internally - prefer waitForStableLayout in tests.
 */
async function waitForCanvasStable(page: Page, timeoutMs: number): Promise<void> {
  const POLL_INTERVAL = 50;
  const canvas = getCanvas(page);
  let prev = await canvas.screenshot();
  let stable = false;
  const startTime = Date.now();

  while (!stable && Date.now() - startTime < timeoutMs) {
    await page.waitForTimeout(POLL_INTERVAL);
    const current = await canvas.screenshot();
    stable = Buffer.compare(prev, current) === 0;
    prev = current;
  }
}

// =============================================================================
// Snapshot helpers
// =============================================================================

export async function getCanvasSnapshot(page: Page): Promise<Buffer> {
  const canvas = getCanvas(page);
  return await canvas.screenshot();
}

// =============================================================================
// Drag helpers
// =============================================================================

export interface DragOptions {
  steps?: number;
  stepDelay?: number;
  settleDelay?: number;
}

const DEFAULT_DRAG_OPTIONS: Required<DragOptions> = {
  steps: 20,
  stepDelay: 10,
  settleDelay: 0, // Callers should use waitForStableLayout for proper settling
};

export async function drag(
  page: Page,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options: DragOptions = {}
): Promise<void> {
  const { steps, stepDelay, settleDelay } = { ...DEFAULT_DRAG_OPTIONS, ...options };

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    const y = startY + ((endY - startY) * i) / steps;
    await page.mouse.move(x, y);
    await page.waitForTimeout(stepDelay);
  }

  await page.mouse.up();
  if (settleDelay > 0) {
    await page.waitForTimeout(settleDelay);
  }
}

export async function dragNode(
  page: Page,
  nodeName: NodeName,
  endX: number,
  endY: number,
  options?: DragOptions
): Promise<void> {
  const pos = NODE_POSITIONS[nodeName];
  await drag(page, pos.x, pos.y, endX, endY, options);
}

export async function dragNodeToNode(
  page: Page,
  fromNode: NodeName,
  toNode: NodeName,
  options?: DragOptions
): Promise<void> {
  const from = NODE_POSITIONS[fromNode];
  const to = NODE_POSITIONS[toNode];
  await drag(page, from.x, from.y, to.x, to.y, options);
}

export async function dragNodeToTopBar(
  page: Page,
  nodeName: NodeName,
  targetX?: number,
  options?: DragOptions
): Promise<void> {
  const pos = NODE_POSITIONS[nodeName];
  const topBarY = TOP_BAR_HEIGHT / 2;
  await drag(page, pos.x, pos.y, targetX ?? pos.x, topBarY, options);
}

export async function snapOutNode(
  page: Page,
  nodeName: NodeName,
  direction: "down" | "up" | "left" | "right" = "down",
  extraDistance: number = 100,
  options?: DragOptions
): Promise<{ endX: number; endY: number }> {
  const pos = NODE_POSITIONS[nodeName];
  const distance = SNAP_OUT_THRESHOLD + extraDistance;

  let endX = pos.x;
  let endY = pos.y;

  switch (direction) {
    case "down":
      endY = pos.y + distance;
      break;
    case "up":
      endY = pos.y - distance;
      break;
    case "left":
      endX = pos.x - distance;
      break;
    case "right":
      endX = pos.x + distance;
      break;
  }

  await drag(page, pos.x, pos.y, endX, endY, options);
  return { endX, endY };
}

// =============================================================================
// Layout stability helpers
// =============================================================================

/**
 * Wait for canvas layout to stabilize by polling until consecutive snapshots match.
 * Uses 50ms polling interval for fast detection while avoiding excessive CPU usage.
 */
export async function waitForStableLayout(page: Page, timeoutMs = 500): Promise<void> {
  const POLL_INTERVAL = 50;
  let prev = await getCanvasSnapshot(page);
  let stable = false;
  const startTime = Date.now();

  while (!stable && Date.now() - startTime < timeoutMs) {
    await page.waitForTimeout(POLL_INTERVAL);
    const current = await getCanvasSnapshot(page);
    stable = Buffer.compare(prev, current) === 0;
    prev = current;
  }
}

// =============================================================================
// High-level action helpers
// =============================================================================

export interface Position {
  x: number;
  y: number;
}

/**
 * Make a node a root by dragging it to the top bar.
 * Returns the position where the root was placed.
 */
export async function makeRoot(
  page: Page,
  nodeName: NodeName,
  targetX: number,
  options?: DragOptions
): Promise<Position> {
  await dragNodeToTopBar(page, nodeName, targetX, options);
  await waitForStableLayout(page);
  return { x: targetX, y: TOP_BAR_CENTER_Y };
}

/**
 * Snap out a node and connect it to another node.
 * Returns the final position after connection.
 */
export async function snapOutAndConnectTo(
  page: Page,
  nodeName: NodeName,
  targetNode: NodeName,
  snapDirection: "down" | "up" | "left" | "right" = "down",
  options?: DragOptions
): Promise<void> {
  const { endX, endY } = await snapOutNode(page, nodeName, snapDirection, 100, options);
  await waitForStableLayout(page);

  const targetPos = NODE_POSITIONS[targetNode];
  await drag(page, endX, endY, targetPos.x, targetPos.y, options);
  await waitForStableLayout(page);
}

/**
 * Snap out a node and connect it to a specific position.
 */
export async function snapOutAndConnectToPosition(
  page: Page,
  nodeName: NodeName,
  targetX: number,
  targetY: number,
  snapDirection: "down" | "up" | "left" | "right" = "down",
  options?: DragOptions
): Promise<void> {
  const { endX, endY } = await snapOutNode(page, nodeName, snapDirection, 100, options);
  await waitForStableLayout(page);

  await drag(page, endX, endY, targetX, targetY, options);
  await waitForStableLayout(page);
}

/**
 * Connect a free node to a root position in the top bar.
 */
export async function connectToRootPosition(
  page: Page,
  nodeName: NodeName,
  rootX: number,
  options?: DragOptions
): Promise<void> {
  const pos = NODE_POSITIONS[nodeName];
  await drag(page, pos.x, pos.y, rootX, TOP_BAR_CENTER_Y, options);
  await waitForStableLayout(page);
}

// =============================================================================
// Assertion helpers
// =============================================================================

/**
 * Execute an action and assert that the layout changed.
 * Takes a before snapshot, runs the action, waits for stable layout, and compares.
 */
export async function expectLayoutChanged(
  page: Page,
  action: () => Promise<void>
): Promise<{ before: Buffer; after: Buffer }> {
  const before = await getCanvasSnapshot(page);
  await action();
  await waitForStableLayout(page);
  const after = await getCanvasSnapshot(page);

  if (Buffer.compare(before, after) === 0) {
    throw new Error("Expected layout to change, but it remained the same");
  }

  return { before, after };
}

/**
 * Execute an action and return before/after snapshots without asserting change.
 */
export async function captureLayoutChange(
  page: Page,
  action: () => Promise<void>
): Promise<{ before: Buffer; after: Buffer }> {
  const before = await getCanvasSnapshot(page);
  await action();
  await waitForStableLayout(page);
  const after = await getCanvasSnapshot(page);
  return { before, after };
}
