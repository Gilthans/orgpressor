/**
 * Tests verifying the initial state of the org chart after page load.
 * These tests ensure the test data is correctly rendered before any user interaction.
 */
import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import {
  expectToBeRoot,
  expectToBeConnected,
  expectChildCount,
  expectToBeFree,
  expectToBeInTopBar,
  expectChildren,
  expectRootCount,
} from "./assertions";

test.describe("Initial State", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

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
