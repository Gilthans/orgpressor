import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_CENTER_Y, SNAP_OUT_THRESHOLD } from "./test-utils";

test.describe("Root Node Behavior", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test("root can be dragged horizontally in top bar", async () => {
    const johnPos = await orgChart.getNodePosition("John Smith");

    // Drag John left within the top bar
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(johnPos.x, johnPos.y, johnPos.x - 100, johnPos.y);
    });

    // Drag John right within the top bar
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(johnPos.x - 100, johnPos.y, johnPos.x + 100, johnPos.y);
    });
  });

  test("root snaps out when dragged past threshold", async () => {
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutNode("John Smith", "down");
    });
  });

  test("root with children snaps out with entire tree", async () => {
    // Snap out John (has Sarah, Michael, and all their children)
    const endPos = await orgChart.snapOutNode("John Smith", "down");

    // Drag the entire tree around to verify all children follow
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(endPos.x, endPos.y, endPos.x + 100, endPos.y + 50);
    });
  });

  test("snapped-out root can become root again", async () => {
    // Snap out John
    const endPos = await orgChart.snapOutNode("John Smith", "down");

    // Drag back to top bar
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(endPos.x, endPos.y, 400, TOP_BAR_CENTER_Y);
    });
  });

  test("root rubber-bands within threshold", async () => {
    const johnPos = await orgChart.getNodePosition("John Smith");

    // Drag John down but within threshold (should snap back)
    const smallDistance = SNAP_OUT_THRESHOLD - 50;
    await orgChart.drag(johnPos.x, johnPos.y, johnPos.x, johnPos.y + smallDistance);
    await orgChart.waitForStableLayout();
  });
});
