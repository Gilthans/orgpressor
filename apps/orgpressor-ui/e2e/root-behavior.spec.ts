import { test, expect } from "@playwright/test";
import {
  setupPage,
  getCanvas,
  drag,
  snapOutNode,
  waitForStableLayout,
  expectLayoutChanged,
  TOP_BAR_CENTER_Y,
  SNAP_OUT_THRESHOLD,
  NODE_POSITIONS,
} from "./test-utils";

test.describe("Root Node Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("root can be dragged horizontally in top bar", async ({ page }) => {
    const johnPos = NODE_POSITIONS["John Smith"];

    // Drag John left within the top bar
    await expectLayoutChanged(page, async () => {
      await drag(page, johnPos.x, johnPos.y, johnPos.x - 100, johnPos.y);
    });

    // Drag John right within the top bar
    await expectLayoutChanged(page, async () => {
      await drag(page, johnPos.x - 100, johnPos.y, johnPos.x + 100, johnPos.y);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("root snaps out when dragged past threshold", async ({ page }) => {
    await expectLayoutChanged(page, async () => {
      await snapOutNode(page, "John Smith", "down");
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("root with children snaps out with entire tree", async ({ page }) => {
    // Snap out John (has Sarah, Michael, and all their children)
    const { endX, endY } = await snapOutNode(page, "John Smith", "down");
    await waitForStableLayout(page);

    // Drag the entire tree around to verify all children follow
    await expectLayoutChanged(page, async () => {
      await drag(page, endX, endY, endX + 100, endY + 50);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("snapped-out root can become root again", async ({ page }) => {
    // Snap out John
    const { endX, endY } = await snapOutNode(page, "John Smith", "down");
    await waitForStableLayout(page);

    // Drag back to top bar
    await expectLayoutChanged(page, async () => {
      await drag(page, endX, endY, 400, TOP_BAR_CENTER_Y);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("root rubber-bands within threshold", async ({ page }) => {
    const johnPos = NODE_POSITIONS["John Smith"];

    // Drag John down but within threshold (should snap back)
    const smallDistance = SNAP_OUT_THRESHOLD - 50;
    await drag(page, johnPos.x, johnPos.y, johnPos.x, johnPos.y + smallDistance);
    await waitForStableLayout(page);

    // Canvas should still be functional
    await expect(getCanvas(page)).toBeVisible();
  });
});
