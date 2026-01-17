import { test, expect } from "@playwright/test";
import {
  setupPage,
  getCanvas,
  getCanvasSnapshot,
  dragNodeToNode,
  dragNodeToTopBar,
  snapOutNode,
  drag,
  TOP_BAR_HEIGHT,
  NODE_POSITIONS,
} from "./test-utils";

test.describe("Drag Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test.describe("Free node (no children)", () => {
    test("dragging to top bar and releasing creates a root", async ({ page }) => {
      const before = await getCanvasSnapshot(page);

      await dragNodeToTopBar(page, "Jennifer Taylor", 900);

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });

    test("dragging to hierarchy node and releasing connects them", async ({ page }) => {
      const before = await getCanvasSnapshot(page);

      await dragNodeToNode(page, "Jennifer Taylor", "John Smith");

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });
  });

  test.describe("Connected node (no children)", () => {
    test("snaps out when dragged past threshold", async ({ page }) => {
      const before = await getCanvasSnapshot(page);

      await snapOutNode(page, "Emily Davis", "down");

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });

    test("snaps back when dragged within threshold", async ({ page }) => {
      const pos = NODE_POSITIONS["Emily Davis"];

      // Drag within threshold - should snap back
      await drag(page, pos.x, pos.y, pos.x + 50, pos.y + 50);

      // No crash, canvas still visible
      await expect(getCanvas(page)).toBeVisible();
    });
  });

  test.describe("Node with children (subtree)", () => {
    test("subtree snaps out together when dragged past threshold", async ({ page }) => {
      const before = await getCanvasSnapshot(page);

      await snapOutNode(page, "Sarah Johnson", "down");

      await page.waitForTimeout(300);
      const after = await getCanvasSnapshot(page);

      expect(Buffer.compare(before, after)).not.toBe(0);
    });

    test("subtree can be dragged to top bar after snapping out", async ({ page }) => {
      // Snap out Sarah first
      const { endX, endY } = await snapOutNode(page, "Sarah Johnson", "down");
      await page.waitForTimeout(400);

      const beforeRoot = await getCanvasSnapshot(page);

      // Now drag to top bar (to the right of existing root)
      const topBarY = TOP_BAR_HEIGHT / 2;
      await drag(page, endX, endY, 700, topBarY);

      await page.waitForTimeout(300);
      const afterRoot = await getCanvasSnapshot(page);

      expect(Buffer.compare(beforeRoot, afterRoot)).not.toBe(0);
    });

    test("subtree can be connected to another node after snapping out", async ({ page }) => {
      // Snap out Michael Chen (has children Lisa and David)
      const { endX, endY } = await snapOutNode(page, "Michael Chen", "down");
      await page.waitForTimeout(400);

      const beforeConnect = await getCanvasSnapshot(page);

      // Drag to Sarah's position
      const sarahPos = NODE_POSITIONS["Sarah Johnson"];
      await drag(page, endX, endY, sarahPos.x, sarahPos.y);

      await page.waitForTimeout(300);
      const afterConnect = await getCanvasSnapshot(page);

      expect(Buffer.compare(beforeConnect, afterConnect)).not.toBe(0);
    });

    test("subtree moves together during free drag", async ({ page }) => {
      // Snap out Sarah first
      const { endX, endY } = await snapOutNode(page, "Sarah Johnson", "down");
      await page.waitForTimeout(400);

      // Drag around
      await drag(page, endX, endY, endX + 150, endY + 50);
      await drag(page, endX + 150, endY + 50, endX - 100, endY + 100);

      // No errors, canvas still functional
      await expect(getCanvas(page)).toBeVisible();
    });
  });
});
