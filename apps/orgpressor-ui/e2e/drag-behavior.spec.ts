import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_CENTER_Y } from "./test-utils";

test.describe("Drag Behavior", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test.describe("Free node (no children)", () => {
    test("dragging to top bar and releasing creates a root", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.makeRoot("Jennifer Taylor", 900);
      });
    });

    test("dragging to hierarchy node and releasing connects them", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.connectNodes("Jennifer Taylor", "John Smith");
      });
    });
  });

  test.describe("Connected node (no children)", () => {
    test("snaps out when dragged past threshold", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.snapOutNode("Emily Davis", "down");
      });
    });

    test("snaps back when dragged within threshold", async () => {
      const pos = await orgChart.getNodePosition("Emily Davis");

      // Drag within threshold - should snap back
      await orgChart.drag(pos.x, pos.y, pos.x + 50, pos.y + 50);
      await orgChart.waitForStableLayout();
    });
  });

  test.describe("Node with children (subtree)", () => {
    test("subtree snaps out together when dragged past threshold", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.snapOutNode("Sarah Johnson", "down");
      });
    });

    test("subtree can be dragged to top bar after snapping out", async () => {
      // Snap out Sarah first
      const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

      // Now drag to top bar (to the right of existing root)
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.drag(endPos.x, endPos.y, 700, TOP_BAR_CENTER_Y);
      });
    });

    test("subtree can be connected to another node after snapping out", async () => {
      // Snap out Michael Chen (has children Lisa and David)
      const endPos = await orgChart.snapOutNode("Michael Chen", "down");

      // Drag to Sarah's position
      const sarahPos = await orgChart.getNodePosition("Sarah Johnson");
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.drag(endPos.x, endPos.y, sarahPos.x, sarahPos.y);
      });
    });

    test("subtree moves together during free drag", async () => {
      // Snap out Sarah first
      const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

      // Drag around
      await orgChart.drag(endPos.x, endPos.y, endPos.x + 150, endPos.y + 50);
      await orgChart.drag(endPos.x + 150, endPos.y + 50, endPos.x - 100, endPos.y + 100);
      await orgChart.waitForStableLayout();
    });
  });
});
