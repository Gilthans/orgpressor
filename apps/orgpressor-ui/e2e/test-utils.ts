import { Page, Locator } from "@playwright/test";

// =============================================================================
// Config constants (must match src/config.ts)
// =============================================================================

export const TOP_BAR_HEIGHT = 60;
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
  // Wait for layout animation to complete
  await page.waitForTimeout(1000);
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
  settleDelay: 100,
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
  await page.waitForTimeout(settleDelay);
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
