/**
 * Tests for hierarchy modification operations: creating roots, connecting nodes,
 * disconnecting (snap-out), and reparenting.
 */
import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import {
  expectToBeRoot,
  expectToBeConnected,
  expectNotToBeConnected,
  expectToBeFree,
  expectToBeInHierarchy,
  expectRootCount,
} from "./assertions";
import { TOP_BAR_CENTER_Y } from "./test-utils";

test.describe("Hierarchy Operations", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test.describe("Creating Roots", () => {
    test("free node can become a root", async () => {
      await expectToBeFree(orgChart, "Jennifer Taylor");

      await orgChart.makeRoot("Jennifer Taylor", 800);

      await expectToBeRoot(orgChart, "Jennifer Taylor");
      await expectRootCount(orgChart, 2);
    });

    test("snapped-out node can become a root", async () => {
      // Snap out Sarah from John
      await orgChart.snapOutNode("Sarah Johnson", "down");
      await expectNotToBeConnected(orgChart, "John Smith", "Sarah Johnson");

      // Make Sarah a root by dragging to top bar (use makeRoot for proper positioning)
      await orgChart.makeRoot("Sarah Johnson", 800);

      await expectToBeRoot(orgChart, "Sarah Johnson");
      await expectRootCount(orgChart, 2);
    });

    test("snapped-out root can become root again", async () => {
      // Snap out John
      const endPos = await orgChart.snapOutNode("John Smith", "down");

      // Drag back to top bar
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.drag(endPos.x, endPos.y, 400, TOP_BAR_CENTER_Y);
      });
    });
  });

  test.describe("Connecting Nodes", () => {
    test("free node can connect to hierarchy", async () => {
      await expectToBeFree(orgChart, "Jennifer Taylor");

      await orgChart.connectNodes("Jennifer Taylor", "Sarah Johnson");

      await expectToBeConnected(orgChart, "Sarah Johnson", "Jennifer Taylor");
      await expectToBeInHierarchy(orgChart, "Jennifer Taylor");
    });

    test("free node can connect to root", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.connectNodes("Jennifer Taylor", "John Smith");
      });
    });
  });

  test.describe("Reparenting (Snap Out and Reconnect)", () => {
    test("node reconnects to different parent", async () => {
      // Emily is currently under Sarah - snap out and connect to Michael
      await expectToBeConnected(orgChart, "Sarah Johnson", "Emily Davis");

      await orgChart.snapOutAndConnectTo("Emily Davis", "Michael Chen");

      await expectNotToBeConnected(orgChart, "Sarah Johnson", "Emily Davis");
      await expectToBeConnected(orgChart, "Michael Chen", "Emily Davis");
    });

    test("node reconnects to same parent", async () => {
      // Snap out Emily from Sarah, then reconnect back
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.snapOutAndConnectTo("Emily Davis", "Sarah Johnson");
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

    test("node connects to newly created root", async () => {
      // Make Jennifer a root
      await orgChart.makeRoot("Jennifer Taylor", 800);

      // Snap out Emily and connect to Jennifer
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.snapOutAndConnectTo("Emily Davis", "Jennifer Taylor");
      });
    });
  });

  test.describe("Root with Subtree", () => {
    test("root snaps out with entire tree", async () => {
      // Snap out John (has Sarah, Michael, and all their children)
      const endPos = await orgChart.snapOutNode("John Smith", "down");

      // Drag the entire tree around to verify all children follow
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.drag(endPos.x, endPos.y, endPos.x + 100, endPos.y + 50);
      });
    });
  });
});
