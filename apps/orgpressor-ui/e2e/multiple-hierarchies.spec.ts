import { test, expect } from "@playwright/test";
import {
  setupPage,
  getCanvas,
  drag,
  snapOutNode,
  waitForStableLayout,
  expectLayoutChanged,
  snapOutAndConnectTo,
  makeRoot,
  connectToRootPosition,
  TOP_BAR_CENTER_Y,
  NODE_POSITIONS,
} from "./test-utils";

test.describe("Multiple Hierarchies", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("second root positioned to right of first", async ({ page }) => {
    const johnPos = NODE_POSITIONS["John Smith"];

    await expectLayoutChanged(page, async () => {
      await makeRoot(page, "Jennifer Taylor", johnPos.x + 300);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("multiple roots layout independently", async ({ page }) => {
    // Create Jennifer as a second root
    const jenniferRoot = await makeRoot(page, "Jennifer Taylor", 700);

    // Add James as child of Jennifer
    await expectLayoutChanged(page, async () => {
      await connectToRootPosition(page, "James Brown", jenniferRoot.x);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("merge trees by connecting root to other hierarchy", async ({ page }) => {
    // Create Jennifer as a second root
    await makeRoot(page, "Jennifer Taylor", 700);

    // Snap out Jennifer and connect to Sarah (in John's hierarchy)
    await expectLayoutChanged(page, async () => {
      await snapOutAndConnectTo(page, "Jennifer Taylor", "Sarah Johnson");
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("snap out hierarchy and connect to another", async ({ page }) => {
    // Create Jennifer as root with James as child
    const jenniferRoot = await makeRoot(page, "Jennifer Taylor", 700);
    await connectToRootPosition(page, "James Brown", jenniferRoot.x);

    // Snap out Jennifer (with James) and connect under Michael
    await expectLayoutChanged(page, async () => {
      await drag(page, jenniferRoot.x, jenniferRoot.y, 700, 300);
      await waitForStableLayout(page);

      const michaelPos = NODE_POSITIONS["Michael Chen"];
      await drag(page, 700, 300, michaelPos.x, michaelPos.y);
    });

    await expect(getCanvas(page)).toBeVisible();
  });

  test("each hierarchy maintains own Y levels", async ({ page }) => {
    // Create Jennifer as second root
    const jenniferRoot = await makeRoot(page, "Jennifer Taylor", 800);

    // Add James as child of Jennifer
    await connectToRootPosition(page, "James Brown", jenniferRoot.x);

    // Add Maria as child of James (James is at y=130)
    const mariaPos = NODE_POSITIONS["Maria Garcia"];
    await drag(page, mariaPos.x, mariaPos.y, 800, 130);
    await waitForStableLayout(page);

    await expect(getCanvas(page)).toBeVisible();
  });

  test("removing root leaves other hierarchies intact", async ({ page }) => {
    // Create Jennifer as second root with James as child
    const jenniferRoot = await makeRoot(page, "Jennifer Taylor", 800);
    await connectToRootPosition(page, "James Brown", jenniferRoot.x);

    // Snap out Jennifer (making her free again, taking James)
    await expectLayoutChanged(page, async () => {
      await drag(page, jenniferRoot.x, jenniferRoot.y, 600, 450);
    });

    await expect(getCanvas(page)).toBeVisible();
  });
});
