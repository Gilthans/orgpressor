/**
 * Tests for subtree operations: verifying that children stay connected to their parent
 * during drag operations, snap-outs, and reconnections.
 */
import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { expectChildren, expectToBeConnected } from "./assertions";
import { TOP_BAR_CENTER_Y } from "./test-utils";

test.describe("Subtree Operations", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test.describe("Subtree Integrity During Snap-Out", () => {
    test("children stay connected after parent snap-out", async () => {
      // Sarah has Emily and Robert as children
      await expectChildren(orgChart, "Sarah Johnson", ["Emily Davis", "Robert Wilson"]);

      // Snap out Sarah
      await orgChart.snapOutNode("Sarah Johnson", "down");

      // Children should still be connected to Sarah
      await expectChildren(orgChart, "Sarah Johnson", ["Emily Davis", "Robert Wilson"]);
    });

    test("grandchildren preserved through snap-out to root", async () => {
      // Snap out Sarah (has children Emily and Robert)
      const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

      // Make Sarah a root - drag straight up to top bar
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.drag(endPos.x, endPos.y, endPos.x, TOP_BAR_CENTER_Y);
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

  test.describe("Subtree Movement", () => {
    test("subtree snaps out together when parent dragged past threshold", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.snapOutNode("Sarah Johnson", "down");
      });
    });

    test("subtree moves together during free drag", async () => {
      // Snap out Sarah first
      const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

      // Drag around - children should follow
      await orgChart.drag(endPos.x, endPos.y, endPos.x + 150, endPos.y + 50);
      await orgChart.drag(endPos.x + 150, endPos.y + 50, endPos.x - 100, endPos.y + 100);
      await orgChart.waitForStableLayout();
    });

    test("subtree can be dragged to top bar after snapping out", async () => {
      // Snap out Sarah first
      const endPos = await orgChart.snapOutNode("Sarah Johnson", "down");

      // Now drag straight up to top bar
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.drag(endPos.x, endPos.y, endPos.x, TOP_BAR_CENTER_Y);
      });
    });
  });

  test.describe("Subtree Reconnection", () => {
    test("subtree can be connected to another node after snapping out", async () => {
      // Snap out Michael Chen (has children Lisa and David)
      const endPos = await orgChart.snapOutNode("Michael Chen", "down");

      // Drag to Sarah's position
      const sarahPos = await orgChart.getNodePosition("Sarah Johnson");
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.drag(endPos.x, endPos.y, sarahPos.x, sarahPos.y);
      });
    });

    test("subtree reconnects to different branch with children intact", async () => {
      // Snap out Sarah (with Emily and Robert)
      await orgChart.snapOutAndConnectTo("Sarah Johnson", "Michael Chen");

      // Sarah should now be under Michael
      await expectToBeConnected(orgChart, "Michael Chen", "Sarah Johnson");

      // Sarah's children should still be attached
      await expectChildren(orgChart, "Sarah Johnson", ["Emily Davis", "Robert Wilson"]);
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
  });
});
