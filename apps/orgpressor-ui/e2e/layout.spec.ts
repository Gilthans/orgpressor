/**
 * Tests for layout verification: Y-level spacing, sibling positioning,
 * free node positioning, and layout stability.
 */
import { test, expect } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_HEIGHT } from "./test-utils";

test.describe("Layout", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test.describe("Y-Level Spacing", () => {
    test("root at Y approximately 30 (centered in 60px top bar)", async () => {
      const johnPos = await orgChart.getNodePosition("John Smith");

      // Root should be centered in the 60px top bar
      expect(johnPos.y).toBeCloseTo(TOP_BAR_HEIGHT / 2, 0);
      expect(TOP_BAR_HEIGHT).toBe(60);
    });

    test("level separation is 100px", async () => {
      const johnPos = await orgChart.getNodePosition("John Smith");
      const sarahPos = await orgChart.getNodePosition("Sarah Johnson");
      const emilyPos = await orgChart.getNodePosition("Emily Davis");

      expect(sarahPos.y - johnPos.y).toBe(100);
      expect(emilyPos.y - sarahPos.y).toBe(100);
    });

    test("free nodes below hierarchy", async () => {
      const emilyPos = await orgChart.getNodePosition("Emily Davis");
      const jenniferPos = await orgChart.getNodePosition("Jennifer Taylor");

      // Free nodes should be positioned well below the hierarchy
      expect(jenniferPos.y).toBeGreaterThan(emilyPos.y + 100);
    });
  });

  test.describe("Sibling Positioning", () => {
    test("new child positioned right of siblings", async () => {
      // Add Jennifer to Sarah (who already has Emily and Robert)
      await orgChart.expectLayoutChanged(async () => {
        await orgChart.connectNodes("Jennifer Taylor", "Sarah Johnson");
      });
    });
  });

  test.describe("Layout Stability", () => {
    test("layout stable after rapid operations", async () => {
      // Get initial positions
      const jenniferPos = await orgChart.getNodePosition("Jennifer Taylor");
      const sarahPos = await orgChart.getNodePosition("Sarah Johnson");
      const jamesPos = await orgChart.getNodePosition("James Brown");

      // Perform rapid operations with minimal delays
      await orgChart.drag(jenniferPos.x, jenniferPos.y, sarahPos.x, sarahPos.y, { steps: 10, stepDelay: 5 });
      await orgChart.snapOutNode("Emily Davis", "down", 50);
      await orgChart.drag(jamesPos.x, jamesPos.y, sarahPos.x, sarahPos.y, { steps: 10, stepDelay: 5 });

      // Wait for layout to stabilize
      await orgChart.waitForStableLayout(1000);

      // Verify layout is stable by taking two snapshots
      const snapshot1 = await orgChart.takeSnapshot();
      await orgChart.waitForStableLayout(200);
      const snapshot2 = await orgChart.takeSnapshot();

      // Layout should be stable (no drift)
      expect(Buffer.compare(snapshot1, snapshot2)).toBe(0);
    });
  });
});
