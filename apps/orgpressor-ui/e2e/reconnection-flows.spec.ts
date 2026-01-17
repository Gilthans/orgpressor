import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";

test.describe("Reconnection Flows", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test("snap out then reconnect to different parent", async () => {
    // Emily is currently under Sarah - snap out and connect to Michael
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Emily Davis", "Michael Chen");
    });
  });

  test("snap out then reconnect to same parent", async () => {
    // Snap out Emily from Sarah, then reconnect back
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Emily Davis", "Sarah Johnson");
    });
  });

  test("snap out subtree then reconnect to different branch", async () => {
    // Snap out Sarah (with Emily and Robert) and connect under Michael
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Sarah Johnson", "Michael Chen");
    });
  });

  test("node reconnected multiple times sequentially", async () => {
    // Snap out Robert and connect to Michael
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Robert Wilson", "Michael Chen");
    });

    // Robert is now under Michael - get his new position
    const robertPos = await orgChart.getNodePosition("Robert Wilson");

    // Snap out from new position
    await orgChart.drag(robertPos.x, robertPos.y, robertPos.x, robertPos.y + 250);
    await orgChart.waitForStableLayout();

    // Connect to Lisa
    const lisaPos = await orgChart.getNodePosition("Lisa Anderson");
    await orgChart.drag(robertPos.x, robertPos.y + 250, lisaPos.x, lisaPos.y);
    await orgChart.waitForStableLayout();
  });

  test("connect to newly created root", async () => {
    // Make Jennifer a root
    await orgChart.makeRoot("Jennifer Taylor", 800);

    // Snap out Emily and connect to Jennifer
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Emily Davis", "Jennifer Taylor");
    });
  });
});
