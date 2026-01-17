import { test, expect } from "@playwright/test";
import {
  setupPage,
  getCanvas,
  drag,
  waitForStableLayout,
  expectLayoutChanged,
  snapOutAndConnectTo,
  snapOutAndConnectToPosition,
  makeRoot,
  NODE_POSITIONS,
} from "./test-utils";

test.describe("Reconnection Flows", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("snap out then reconnect to different parent", async ({ page }) => {
    // Emily is currently under Sarah - snap out and connect to Michael
    await expectLayoutChanged(page, async () => {
      await snapOutAndConnectTo(page, "Emily Davis", "Michael Chen");
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("snap out then reconnect to same parent", async ({ page }) => {
    // Snap out Emily from Sarah, then reconnect back
    await expectLayoutChanged(page, async () => {
      await snapOutAndConnectTo(page, "Emily Davis", "Sarah Johnson");
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("snap out subtree then reconnect to different branch", async ({ page }) => {
    // Snap out Sarah (with Emily and Robert) and connect under Michael
    await expectLayoutChanged(page, async () => {
      await snapOutAndConnectTo(page, "Sarah Johnson", "Michael Chen");
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("node reconnected multiple times sequentially", async ({ page }) => {
    // Snap out Robert and connect to Michael
    await expectLayoutChanged(page, async () => {
      await snapOutAndConnectTo(page, "Robert Wilson", "Michael Chen");
    });

    // Robert is now under Michael at level 2
    // Snap out from new position and connect to Lisa
    const michaelPos = NODE_POSITIONS["Michael Chen"];
    const robertNewX = michaelPos.x + 50;
    const robertNewY = 230; // Level 2

    await drag(page, robertNewX, robertNewY, robertNewX, robertNewY + 250);
    await waitForStableLayout(page);

    const lisaPos = NODE_POSITIONS["Lisa Anderson"];
    await drag(page, robertNewX, robertNewY + 250, lisaPos.x, lisaPos.y);
    await waitForStableLayout(page);

    await expect(getCanvas(page)).toBeVisible();
  });

  test("connect to newly created root", async ({ page }) => {
    // Make Jennifer a root
    const jenniferRoot = await makeRoot(page, "Jennifer Taylor", 800);

    // Snap out Emily and connect to Jennifer
    await expectLayoutChanged(page, async () => {
      await snapOutAndConnectToPosition(page, "Emily Davis", jenniferRoot.x, jenniferRoot.y);
    });

    await expect(getCanvas(page)).toBeVisible();
  });
});
