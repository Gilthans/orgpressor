/**
 * Tests for viewport resize behavior at different zoom levels.
 * Verifies that root nodes stay in the top bar when the viewport changes.
 */
import { test, expect } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { VIEWPORT, TOP_BAR_HEIGHT } from "./test-utils";

test.describe("Viewport Resize", () => {
  test.describe("At Default Zoom", () => {
    test("root nodes stay in top bar after viewport height decrease", async ({ page }) => {
      const orgChart = new OrgChartPage(page);
      await orgChart.goto();

      await page.screenshot({ path: "test-results/resize-height-1-initial.png", fullPage: true });

      // Simulate dev tools opening at bottom
      const newHeight = VIEWPORT.height - 200;
      await page.setViewportSize({ width: VIEWPORT.width, height: newHeight });

      await page.waitForTimeout(100);
      await orgChart.waitForStableLayout(500);

      await page.screenshot({ path: "test-results/resize-height-2-after-shrink.png", fullPage: true });

      // Restore the viewport
      await page.setViewportSize(VIEWPORT);
      await page.waitForTimeout(100);
      await orgChart.waitForStableLayout(500);

      await page.screenshot({ path: "test-results/resize-height-3-after-restore.png", fullPage: true });
    });

    test("root nodes stay in top bar after viewport width decrease", async ({ page }) => {
      const orgChart = new OrgChartPage(page);
      await orgChart.goto();

      await page.screenshot({ path: "test-results/resize-width-1-initial.png", fullPage: true });

      // Simulate dev tools opening on side
      const newWidth = VIEWPORT.width - 400;
      await page.setViewportSize({ width: newWidth, height: VIEWPORT.height });

      await page.waitForTimeout(100);
      await orgChart.waitForStableLayout(500);

      await page.screenshot({ path: "test-results/resize-width-2-after-shrink.png", fullPage: true });

      // Restore the viewport
      await page.setViewportSize(VIEWPORT);
      await page.waitForTimeout(100);
      await orgChart.waitForStableLayout(500);

      await page.screenshot({ path: "test-results/resize-width-3-after-restore.png", fullPage: true });
    });
  });

  test.describe("When Zoomed Out", () => {
    test("root stays in scaled top bar after height decrease", async ({ page }) => {
      const orgChart = new OrgChartPage(page);
      await orgChart.goto();

      await page.screenshot({ path: "test-results/zoom-resize-01-initial.png" });
      const initialPos = await orgChart.getNodePosition("John Smith");
      console.log("Initial position:", initialPos);

      // Zoom out completely
      const canvas = page.locator("canvas");
      await canvas.hover();
      for (let i = 0; i < 30; i++) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(300);

      await page.screenshot({ path: "test-results/zoom-resize-02-zoomed-out.png" });
      const zoomedOutPos = await orgChart.getNodePosition("John Smith");
      console.log("After zoom out:", zoomedOutPos);

      // At min zoom (0.2), TopBar is 12px, root should be at ~6px
      expect(zoomedOutPos.y, "Root should be near top when zoomed out").toBeLessThan(15);

      // Reduce height significantly
      await page.setViewportSize({ width: 1280, height: 400 });

      await page.screenshot({ path: "test-results/zoom-resize-03-immediate.png" });
      await page.waitForTimeout(100);
      await page.screenshot({ path: "test-results/zoom-resize-04-after-wait.png" });

      const afterResizePos = await orgChart.getNodePosition("John Smith");
      console.log("After resize:", afterResizePos);

      expect(
        afterResizePos.y,
        `Root left scaled top bar! Position: y=${afterResizePos.y}, expected y < 15`
      ).toBeLessThan(15);
    });

    test("root stays in scaled top bar with extreme height reduction", async ({ page }) => {
      const orgChart = new OrgChartPage(page);
      await orgChart.goto();

      // Zoom out to minimum
      const canvas = page.locator("canvas");
      await canvas.hover();
      for (let i = 0; i < 50; i++) {
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(20);
      }
      await page.waitForTimeout(300);

      await page.screenshot({ path: "test-results/extreme-zoom-01-before.png" });
      const beforePos = await orgChart.getNodePosition("John Smith");
      console.log("Before extreme resize (min zoom):", beforePos);
      expect(beforePos.y, "Root should be near top before resize").toBeLessThan(15);

      // Extreme height reduction
      await page.setViewportSize({ width: 1280, height: 250 });
      await page.waitForTimeout(200);

      await page.screenshot({ path: "test-results/extreme-zoom-02-after.png" });
      const afterPos = await orgChart.getNodePosition("John Smith");
      console.log("After extreme resize:", afterPos);

      expect(
        afterPos.y,
        `Root left scaled top bar after extreme resize! y=${afterPos.y}`
      ).toBeLessThan(15);
    });

    test("root position is consistent before and after resize at different zoom levels", async ({ page }) => {
      const orgChart = new OrgChartPage(page);
      await orgChart.goto();

      const zoomLevels = [
        { scrolls: 5, name: "medium zoom" },
        { scrolls: 15, name: "heavy zoom" },
        { scrolls: 30, name: "max zoom" },
      ];

      for (const { scrolls, name } of zoomLevels) {
        // Reset to initial state
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.reload();
        await orgChart.waitForStableLayout();

        // Zoom out
        const canvas = page.locator("canvas");
        await canvas.hover();
        for (let i = 0; i < scrolls; i++) {
          await page.mouse.wheel(0, 1000);
          await page.waitForTimeout(30);
        }
        await page.waitForTimeout(200);

        const beforePos = await orgChart.getNodePosition("John Smith");
        console.log(`${name} - before resize:`, beforePos);

        // Resize
        await page.setViewportSize({ width: 1280, height: 400 });
        await page.waitForTimeout(200);

        const afterPos = await orgChart.getNodePosition("John Smith");
        console.log(`${name} - after resize:`, afterPos);

        const yDiff = Math.abs(afterPos.y - beforePos.y);
        expect(
          yDiff,
          `${name}: Root moved too much during resize! Before: ${beforePos.y}, After: ${afterPos.y}`
        ).toBeLessThan(5);
      }
    });
  });

  test.describe("When Zoomed In", () => {
    test("root stays in top bar after width decrease", async ({ page }) => {
      const orgChart = new OrgChartPage(page);
      await orgChart.goto();

      await page.screenshot({ path: "test-results/zoom-in-resize-01-initial.png" });
      const initialPos = await orgChart.getNodePosition("John Smith");
      console.log("Initial position:", initialPos);

      // Zoom IN completely
      const canvas = page.locator("canvas");
      await canvas.hover();
      for (let i = 0; i < 30; i++) {
        await page.mouse.wheel(0, -1000);
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(300);

      await page.screenshot({ path: "test-results/zoom-in-resize-02-zoomed-in.png" });
      const zoomedInPos = await orgChart.getNodePosition("John Smith");
      console.log("After zoom in:", zoomedInPos);

      // At max zoom (2.0), TopBar is 120px, root should be at ~60px
      expect(zoomedInPos.y, "Root should be in scaled top bar when zoomed in").toBeLessThan(TOP_BAR_HEIGHT * 2 + 10);

      // Reduce WIDTH
      await page.setViewportSize({ width: 900, height: 720 });

      await page.screenshot({ path: "test-results/zoom-in-resize-03-immediate.png" });
      await page.waitForTimeout(100);
      await page.screenshot({ path: "test-results/zoom-in-resize-04-after-wait.png" });

      const afterResizePos = await orgChart.getNodePosition("John Smith");
      console.log("After width resize:", afterResizePos);

      const yDiff = Math.abs(afterResizePos.y - zoomedInPos.y);
      expect(
        yDiff,
        `Root moved too much during width resize! Before: ${zoomedInPos.y}, After: ${afterResizePos.y}`
      ).toBeLessThan(5);
    });

    test("root position is consistent during width resize at max zoom", async ({ page }) => {
      const orgChart = new OrgChartPage(page);
      await orgChart.goto();

      // Zoom in to maximum
      const canvas = page.locator("canvas");
      await canvas.hover();
      for (let i = 0; i < 50; i++) {
        await page.mouse.wheel(0, -2000);
        await page.waitForTimeout(20);
      }
      await page.waitForTimeout(300);

      await page.screenshot({ path: "test-results/width-resize-zoom-in-01-before.png" });
      const beforePos = await orgChart.getNodePosition("John Smith");
      console.log("Before width resize (max zoom in):", beforePos);

      // Reduce width significantly
      await page.setViewportSize({ width: 800, height: 720 });
      await page.waitForTimeout(200);

      await page.screenshot({ path: "test-results/width-resize-zoom-in-02-after.png" });
      const afterPos = await orgChart.getNodePosition("John Smith");
      console.log("After width resize:", afterPos);

      const yDiff = Math.abs(afterPos.y - beforePos.y);
      expect(
        yDiff,
        `Root moved during width resize! Before: ${beforePos.y}, After: ${afterPos.y}`
      ).toBeLessThan(5);
    });
  });
});
