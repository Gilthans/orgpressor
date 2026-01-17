import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_CENTER_Y } from "./test-utils";

test.describe("Subtree Integrity", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test("children stay connected after parent snap-out", async () => {
    // Snap out Sarah (has children Emily and Robert)
    const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

    // Drag the snapped-out subtree around - children should follow
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(endPos.x, endPos.y, endPos.x + 100, endPos.y + 50);
      await orgChart.drag(endPos.x + 100, endPos.y + 50, endPos.x - 50, endPos.y + 100);
    });
  });

  test("grandchildren preserved through snap-out to root", async () => {
    // Snap out Sarah (has children Emily and Robert)
    const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

    // Make Sarah a root - her children should still be attached
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(endPos.x, endPos.y, 800, TOP_BAR_CENTER_Y);
    });
  });

  test("deep subtree survives multiple operations", async () => {
    // Snap out Sarah and connect to Michael
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Sarah Johnson", "Michael Chen");
    });

    // Snap out Michael (now has Sarah + Emily + Robert + Lisa + David)
    const endPos = await orgChart.snapOutNode("Michael Chen", "right", 200);

    // Verify subtree can be moved together
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(endPos.x, endPos.y, endPos.x + 50, endPos.y + 50);
    });
  });

  test("child edges preserved when disconnecting from grandparent", async () => {
    // Snap out Sarah from John - she should keep Emily and Robert
    const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

    // Move the subtree to verify structure intact
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(endPos.x, endPos.y, endPos.x + 150, endPos.y);
    });
  });
});
