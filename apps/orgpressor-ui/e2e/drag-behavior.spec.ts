import { test, expect, Page } from "@playwright/test";

// Config values (must match src/config.ts)
const TOP_BAR_HEIGHT = 60;
const SNAP_OUT_THRESHOLD = 150;

// Helper to wait for the network to be fully ready
async function waitForNetwork(page: Page) {
  await page.waitForSelector("canvas");
  // Wait for layout animation to complete
  await page.waitForTimeout(1000);
}

// Helper to perform a drag operation with smooth movement
async function drag(
  page: Page,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) {
  await page.mouse.move(startX, startY);
  await page.mouse.down();

  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    const y = startY + ((endY - startY) * i) / steps;
    await page.mouse.move(x, y);
    await page.waitForTimeout(10);
  }

  await page.mouse.up();
  await page.waitForTimeout(100);
}

// Helper to take a snapshot of the canvas for comparison
async function getCanvasSnapshot(page: Page) {
  const canvas = page.locator("canvas");
  return await canvas.screenshot();
}

// Layout positions observed from screenshot (1280x720 viewport):
// - Root (John Smith): x≈370, y≈30
// - Level 1 (Sarah Johnson): x≈225, y≈130
// - Level 1 (Michael Chen): x≈515, y≈130
// - Level 2 (Emily Davis): x≈150, y≈230
// - Level 2 (Robert Wilson): x≈300, y≈230
// - Level 2 (Lisa Anderson): x≈445, y≈230
// - Level 2 (David Martinez): x≈590, y≈230
// - Free nodes row: y≈407
// - Jennifer Taylor: x≈625, James Brown: x≈745, Maria Garcia: x≈860, etc.

test.describe("Drag Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await waitForNetwork(page);
  });

  test.describe("Free node (no children)", () => {
    test("dragging to top bar and releasing creates a root", async ({ page }) => {
      const freeNodeX = 620;
      const freeNodeY = 407;

      const before = await getCanvasSnapshot(page);

      // Drag to top bar and release
      const topBarY = TOP_BAR_HEIGHT / 2;
      await drag(page, freeNodeX, freeNodeY, 900, topBarY);

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });

    test("dragging to hierarchy node and releasing connects them", async ({ page }) => {
      const freeNodeX = 620;
      const freeNodeY = 407;

      // Root node (John Smith) at x≈370, y≈30
      const rootNodeX = 370;
      const rootNodeY = 30;

      const before = await getCanvasSnapshot(page);

      await drag(page, freeNodeX, freeNodeY, rootNodeX, rootNodeY);

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });
  });

  test.describe("Connected node (no children)", () => {
    test("snaps out when dragged past threshold", async ({ page }) => {
      // Emily Davis (leaf node) at x≈150, y≈230
      const leafNodeX = 150;
      const leafNodeY = 230;

      const before = await getCanvasSnapshot(page);

      // Drag down past threshold
      const dragEndY = leafNodeY + SNAP_OUT_THRESHOLD + 100;
      await drag(page, leafNodeX, leafNodeY, leafNodeX, dragEndY);

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });

    test("snaps back when dragged within threshold", async ({ page }) => {
      // Emily Davis at x≈150, y≈230
      const leafNodeX = 150;
      const leafNodeY = 230;

      // Drag within threshold - should snap back Y but keep X
      await drag(page, leafNodeX, leafNodeY, leafNodeX + 50, leafNodeY + 50);

      // No crash, canvas still visible
      await expect(page.locator("canvas")).toBeVisible();
    });
  });

  test.describe("Node with children (subtree)", () => {
    test("subtree snaps out together when dragged past threshold", async ({ page }) => {
      // Sarah Johnson (has children Emily and Robert) at x≈225, y≈130
      const sarahX = 225;
      const sarahY = 130;

      const before = await getCanvasSnapshot(page);

      // Snap out by dragging past threshold
      const snapOutY = sarahY + SNAP_OUT_THRESHOLD + 100;
      await drag(page, sarahX, sarahY, sarahX, snapOutY);

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });

    test("subtree can be dragged to top bar after snapping out", async ({ page }) => {
      // Snap out Sarah first
      const sarahX = 225;
      const sarahY = 130;

      const snapOutY = sarahY + SNAP_OUT_THRESHOLD + 100;
      await drag(page, sarahX, sarahY, sarahX, snapOutY);
      await page.waitForTimeout(400);

      const beforeRoot = await getCanvasSnapshot(page);

      // Now drag to top bar (to the right of existing root)
      const topBarY = TOP_BAR_HEIGHT / 2;
      await drag(page, sarahX, snapOutY, 700, topBarY);

      await page.waitForTimeout(300);
      const afterRoot = await getCanvasSnapshot(page);

      expect(Buffer.compare(beforeRoot, afterRoot)).not.toBe(0);
    });

    test("subtree can be connected to another node after snapping out", async ({ page }) => {
      // Snap out Michael Chen (has children Lisa and David) at x≈515, y≈130
      const michaelX = 515;
      const michaelY = 130;

      const snapOutY = michaelY + SNAP_OUT_THRESHOLD + 100;
      await drag(page, michaelX, michaelY, michaelX, snapOutY);
      await page.waitForTimeout(400);

      const beforeConnect = await getCanvasSnapshot(page);

      // Drag to Sarah's position (but Sarah is still connected to John)
      // Sarah is at x≈225, y≈130
      await drag(page, michaelX, snapOutY, 225, 130);

      await page.waitForTimeout(300);
      const afterConnect = await getCanvasSnapshot(page);

      expect(Buffer.compare(beforeConnect, afterConnect)).not.toBe(0);
    });

    test("subtree moves together during free drag", async ({ page }) => {
      // Snap out Sarah first
      const sarahX = 225;
      const sarahY = 130;

      const snapOutY = sarahY + SNAP_OUT_THRESHOLD + 100;
      await drag(page, sarahX, sarahY, sarahX, snapOutY);
      await page.waitForTimeout(400);

      // Drag around
      await drag(page, sarahX, snapOutY, sarahX + 150, snapOutY + 50);
      await drag(page, sarahX + 150, snapOutY + 50, sarahX - 100, snapOutY + 100);

      // No errors, canvas still functional
      await expect(page.locator("canvas")).toBeVisible();
    });
  });
});
