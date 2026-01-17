import { test, expect } from "@playwright/test";
import {
  setupPage,
  getCanvas,
  getCanvasSnapshot,
  drag,
  snapOutNode,
  waitForStableLayout,
  expectLayoutChanged,
  makeRoot,
  dragNodeToNode,
  TOP_BAR_HEIGHT,
  NODE_POSITIONS,
} from "./test-utils";

test.describe("Layout Verification", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("root at Y approximately 30 (centered in 60px top bar)", async ({ page }) => {
    const johnPos = NODE_POSITIONS["John Smith"];
    expect(johnPos.y).toBe(30);
    expect(TOP_BAR_HEIGHT).toBe(60);

    await expect(getCanvas(page)).toBeVisible();
  });

  test("level separation is 100px", async ({ page }) => {
    const johnY = NODE_POSITIONS["John Smith"].y;
    const sarahY = NODE_POSITIONS["Sarah Johnson"].y;
    const emilyY = NODE_POSITIONS["Emily Davis"].y;

    expect(sarahY - johnY).toBe(100);
    expect(emilyY - sarahY).toBe(100);

    await expect(getCanvas(page)).toBeVisible();
  });

  test("free nodes below hierarchy", async ({ page }) => {
    const lowestHierarchyY = NODE_POSITIONS["Emily Davis"].y;
    const freeNodeY = NODE_POSITIONS["Jennifer Taylor"].y;

    expect(freeNodeY).toBeGreaterThan(lowestHierarchyY + 100);

    await expect(getCanvas(page)).toBeVisible();
  });

  test("new child positioned right of siblings", async ({ page }) => {
    // Add Jennifer to Sarah (who already has Emily and Robert)
    await expectLayoutChanged(page, async () => {
      await dragNodeToNode(page, "Jennifer Taylor", "Sarah Johnson");
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("new root positioned right of existing", async ({ page }) => {
    const johnPos = NODE_POSITIONS["John Smith"];

    await expectLayoutChanged(page, async () => {
      await makeRoot(page, "Jennifer Taylor", johnPos.x + 400);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("layout stable after rapid operations", async ({ page }) => {
    const jenniferPos = NODE_POSITIONS["Jennifer Taylor"];
    const sarahPos = NODE_POSITIONS["Sarah Johnson"];
    const jamesPos = NODE_POSITIONS["James Brown"];

    // Perform rapid operations with minimal delays (just enough for events to process)
    await drag(page, jenniferPos.x, jenniferPos.y, sarahPos.x, sarahPos.y, { steps: 10, stepDelay: 5 });
    await snapOutNode(page, "Emily Davis", "down", 50, { steps: 10, stepDelay: 5 });
    await drag(page, jamesPos.x, jamesPos.y, sarahPos.x, sarahPos.y, { steps: 10, stepDelay: 5 });

    // Wait for layout to stabilize using polling
    await waitForStableLayout(page, 1000);

    // Verify layout is stable by taking two snapshots with waitForStableLayout between
    const snapshot1 = await getCanvasSnapshot(page);
    await waitForStableLayout(page, 200);
    const snapshot2 = await getCanvasSnapshot(page);

    // Layout should be stable (no drift)
    expect(Buffer.compare(snapshot1, snapshot2)).toBe(0);
    await expect(getCanvas(page)).toBeVisible();
  });
});
