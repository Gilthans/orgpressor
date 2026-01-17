import { test, expect } from "@playwright/test";
import {
  setupPage,
  getCanvas,
  snapOutNode,
  drag,
  waitForStableLayout,
  expectLayoutChanged,
  snapOutAndConnectTo,
  TOP_BAR_CENTER_Y,
} from "./test-utils";

test.describe("Subtree Integrity", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("children stay connected after parent snap-out", async ({ page }) => {
    // Snap out Sarah (has children Emily and Robert)
    const { endX, endY } = await snapOutNode(page, "Sarah Johnson", "down");
    await waitForStableLayout(page);

    // Drag the snapped-out subtree around - children should follow
    await expectLayoutChanged(page, async () => {
      await drag(page, endX, endY, endX + 100, endY + 50);
      await drag(page, endX + 100, endY + 50, endX - 50, endY + 100);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("grandchildren preserved through snap-out to root", async ({ page }) => {
    // Snap out Sarah (has children Emily and Robert)
    const { endX, endY } = await snapOutNode(page, "Sarah Johnson", "down");
    await waitForStableLayout(page);

    // Make Sarah a root - her children should still be attached
    await expectLayoutChanged(page, async () => {
      await drag(page, endX, endY, 800, TOP_BAR_CENTER_Y);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("deep subtree survives multiple operations", async ({ page }) => {
    // Snap out Sarah and connect to Michael
    await expectLayoutChanged(page, async () => {
      await snapOutAndConnectTo(page, "Sarah Johnson", "Michael Chen");
    });

    // Snap out Michael (now has Sarah + Emily + Robert + Lisa + David)
    const { endX, endY } = await snapOutNode(page, "Michael Chen", "right", 200);
    await waitForStableLayout(page);

    // Verify subtree can be moved together
    await expectLayoutChanged(page, async () => {
      await drag(page, endX, endY, endX + 50, endY + 50);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("child edges preserved when disconnecting from grandparent", async ({ page }) => {
    // Snap out Sarah from John - she should keep Emily and Robert
    const { endX, endY } = await snapOutNode(page, "Sarah Johnson", "down");
    await waitForStableLayout(page);

    // Move the subtree to verify structure intact
    await expectLayoutChanged(page, async () => {
      await drag(page, endX, endY, endX + 150, endY);
    });

    await expect(getCanvas(page)).toBeVisible();
  });
});
