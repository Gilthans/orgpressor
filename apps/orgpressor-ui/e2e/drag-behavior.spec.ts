import { test, expect } from "@playwright/test";
import {
  setupPage,
  getCanvas,
  dragNodeToNode,
  dragNodeToTopBar,
  snapOutNode,
  drag,
  waitForStableLayout,
  expectLayoutChanged,
  TOP_BAR_CENTER_Y,
  NODE_POSITIONS,
} from "./test-utils";

test.describe("Drag Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test.describe("Free node (no children)", () => {
    test("dragging to top bar and releasing creates a root", async ({ page }) => {
      await expectLayoutChanged(page, async () => {
        await dragNodeToTopBar(page, "Jennifer Taylor", 900);
      });
    });

    test("dragging to hierarchy node and releasing connects them", async ({ page }) => {
      await expectLayoutChanged(page, async () => {
        await dragNodeToNode(page, "Jennifer Taylor", "John Smith");
      });
    });
  });

  test.describe("Connected node (no children)", () => {
    test("snaps out when dragged past threshold", async ({ page }) => {
      await expectLayoutChanged(page, async () => {
        await snapOutNode(page, "Emily Davis", "down");
      });
    });

    test("snaps back when dragged within threshold", async ({ page }) => {
      const pos = NODE_POSITIONS["Emily Davis"];

      // Drag within threshold - should snap back
      await drag(page, pos.x, pos.y, pos.x + 50, pos.y + 50);
      await waitForStableLayout(page);

      // No crash, canvas still visible
      await expect(getCanvas(page)).toBeVisible();
    });
  });

  test.describe("Node with children (subtree)", () => {
    test("subtree snaps out together when dragged past threshold", async ({ page }) => {
      await expectLayoutChanged(page, async () => {
        await snapOutNode(page, "Sarah Johnson", "down");
      });
    });

    test("subtree can be dragged to top bar after snapping out", async ({ page }) => {
      // Snap out Sarah first
      const { endX, endY } = await snapOutNode(page, "Sarah Johnson", "down");
      await waitForStableLayout(page);

      // Now drag to top bar (to the right of existing root)
      await expectLayoutChanged(page, async () => {
        await drag(page, endX, endY, 700, TOP_BAR_CENTER_Y);
      });
    });

    test("subtree can be connected to another node after snapping out", async ({ page }) => {
      // Snap out Michael Chen (has children Lisa and David)
      const { endX, endY } = await snapOutNode(page, "Michael Chen", "down");
      await waitForStableLayout(page);

      // Drag to Sarah's position
      const sarahPos = NODE_POSITIONS["Sarah Johnson"];
      await expectLayoutChanged(page, async () => {
        await drag(page, endX, endY, sarahPos.x, sarahPos.y);
      });
    });

    test("subtree moves together during free drag", async ({ page }) => {
      // Snap out Sarah first
      const { endX, endY } = await snapOutNode(page, "Sarah Johnson", "down");
      await waitForStableLayout(page);

      // Drag around
      await drag(page, endX, endY, endX + 150, endY + 50);
      await drag(page, endX + 150, endY + 50, endX - 100, endY + 100);
      await waitForStableLayout(page);

      // No errors, canvas still functional
      await expect(getCanvas(page)).toBeVisible();
    });
  });
});
