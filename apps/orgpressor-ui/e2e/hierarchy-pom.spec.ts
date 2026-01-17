/**
 * Example tests demonstrating the Page Object Model and custom assertions.
 * These tests use dynamic position detection instead of hardcoded coordinates.
 */
import { test, expect } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import {
  expectToBeRoot,
  expectToBeConnected,
  expectNotToBeConnected,
  expectChildCount,
  expectToBeFree,
  expectToBeInHierarchy,
  expectToBeInTopBar,
  expectChildren,
  expectRootCount,
} from "./assertions";

test.describe("Hierarchy Management (POM)", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test.describe("Initial State", () => {
    test("has one root node (John Smith)", async () => {
      await expectRootCount(orgChart, 1);
      await expectToBeRoot(orgChart, "John Smith");
      await expectToBeInTopBar(orgChart, "John Smith");
    });

    test("John Smith has two children", async () => {
      await expectChildCount(orgChart, "John Smith", 2);
      await expectChildren(orgChart, "John Smith", ["Sarah Johnson", "Michael Chen"]);
    });

    test("Sarah Johnson has two children", async () => {
      await expectToBeConnected(orgChart, "John Smith", "Sarah Johnson");
      await expectChildren(orgChart, "Sarah Johnson", ["Emily Davis", "Robert Wilson"]);
    });

    test("free nodes are not in hierarchy", async () => {
      await expectToBeFree(orgChart, "Jennifer Taylor");
      await expectToBeFree(orgChart, "James Brown");
      await expectToBeFree(orgChart, "Maria Garcia");
    });
  });

  test.describe("Creating Roots", () => {
    test("can make a free node into a root", async () => {
      await expectToBeFree(orgChart, "Jennifer Taylor");

      await orgChart.makeRoot("Jennifer Taylor", 800);

      await expectToBeRoot(orgChart, "Jennifer Taylor");
      await expectToBeInTopBar(orgChart, "Jennifer Taylor");
      await expectRootCount(orgChart, 2);
    });

    test("snapped-out node can become a root", async () => {
      // Snap out Sarah from John
      await orgChart.snapOutNode("Sarah Johnson", "down");
      await expectNotToBeConnected(orgChart, "John Smith", "Sarah Johnson");

      // Make Sarah a root
      const pos = await orgChart.getNodePosition("Sarah Johnson");
      await orgChart.drag(pos.x, pos.y, 700, 30);
      await orgChart.waitForStableLayout();

      await expectToBeRoot(orgChart, "Sarah Johnson");
      await expectRootCount(orgChart, 2);
    });
  });

  test.describe("Connecting Nodes", () => {
    test("can connect a free node to hierarchy", async () => {
      await expectToBeFree(orgChart, "Jennifer Taylor");

      await orgChart.connectNodes("Jennifer Taylor", "Sarah Johnson");

      await expectToBeConnected(orgChart, "Sarah Johnson", "Jennifer Taylor");
      await expectToBeInHierarchy(orgChart, "Jennifer Taylor");
    });

    test("snap out and reconnect to different parent", async () => {
      // Emily is initially under Sarah
      await expectToBeConnected(orgChart, "Sarah Johnson", "Emily Davis");

      // Snap out and reconnect to Michael
      await orgChart.snapOutAndConnectTo("Emily Davis", "Michael Chen");

      await expectNotToBeConnected(orgChart, "Sarah Johnson", "Emily Davis");
      await expectToBeConnected(orgChart, "Michael Chen", "Emily Davis");
    });
  });

  test.describe("Subtree Operations", () => {
    test("children stay connected after parent snap-out", async () => {
      // Sarah has Emily and Robert as children
      await expectChildren(orgChart, "Sarah Johnson", ["Emily Davis", "Robert Wilson"]);

      // Snap out Sarah
      await orgChart.snapOutNode("Sarah Johnson", "down");

      // Children should still be connected to Sarah
      await expectChildren(orgChart, "Sarah Johnson", ["Emily Davis", "Robert Wilson"]);
    });

    test("subtree can be reconnected to different branch", async () => {
      // Snap out Sarah (with Emily and Robert)
      await orgChart.snapOutAndConnectTo("Sarah Johnson", "Michael Chen");

      // Sarah should now be under Michael
      await expectToBeConnected(orgChart, "Michael Chen", "Sarah Johnson");

      // Sarah's children should still be attached
      await expectChildren(orgChart, "Sarah Johnson", ["Emily Davis", "Robert Wilson"]);
    });
  });

  test.describe("Dynamic Position Detection", () => {
    test("can detect node positions dynamically", async () => {
      const john = await orgChart.getNode("John Smith");
      expect(john).not.toBeNull();
      expect(john!.position.x).toBeGreaterThan(0);
      expect(john!.position.y).toBeGreaterThan(0);

      // Root should be in top bar area
      expect(john!.position.y).toBeLessThan(60);
    });

    test("positions update after operations", async () => {
      const beforePos = await orgChart.getNodePosition("Emily Davis");

      // Snap out Emily
      await orgChart.snapOutNode("Emily Davis", "down");

      const afterPos = await orgChart.getNodePosition("Emily Davis");

      // Position should have changed
      expect(afterPos.y).toBeGreaterThan(beforePos.y);
    });
  });
});
