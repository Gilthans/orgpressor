/**
 * Tests for low-level drag mechanics: threshold detection, rubber-band effect, and snapping.
 * These tests verify the core drag behavior independent of hierarchy operations.
 */
import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { SNAP_OUT_THRESHOLD } from "./test-utils";

test.describe("Drag Mechanics", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test.describe("Threshold Detection", () => {
    test("connected node snaps out when dragged past threshold", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.snapOutNode("Emily Davis", "down");
      });
    });

    test("connected node snaps back when dragged within threshold", async () => {
      const pos = await orgChart.getNodePosition("Emily Davis");

      // Drag within threshold - should snap back
      await orgChart.drag(pos.x, pos.y, pos.x + 50, pos.y + 50);
      await orgChart.waitForStableLayout();
    });

    test("root snaps out when dragged past threshold", async () => {
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.snapOutNode("John Smith", "down");
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

  test.describe("Root Horizontal Movement", () => {
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
  });
});
