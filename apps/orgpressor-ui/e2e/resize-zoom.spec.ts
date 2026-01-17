import { test, expect } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_HEIGHT } from "./test-utils";

/**
 * These tests verify that root nodes stay in the scaled TopBar when resizing at different zoom levels.
 *
 * Key insight: The TopBar scales with zoom (height = 60 * scale), so the root target Y
 * should also scale (targetY = 30 * scale). When zoomed out to scale 0.2:
 * - TopBar height = 12px
 * - Root should be at y ≈ 6px (center of scaled bar)
 */

test.describe("Resize at Different Zoom Levels", () => {
  test("root stays in scaled top bar after height decrease when fully zoomed out", async ({ page }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    // Take baseline screenshot
    await page.screenshot({ path: "test-results/zoom-resize-01-initial.png" });
    const initialPos = await orgChart.getNodePosition("John Smith");
    console.log("Initial position:", initialPos);

    // Zoom out completely - use more wheel events to ensure we hit minimum scale
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
    // The root should be near the top when zoomed out
    expect(zoomedOutPos.y, "Root should be near top when zoomed out").toBeLessThan(15);

    // Simulate opening developer tools - reduce height significantly
    await page.setViewportSize({ width: 1280, height: 400 });

    // Take screenshot immediately after resize
    await page.screenshot({ path: "test-results/zoom-resize-03-immediate.png" });

    // Wait for any async operations
    await page.waitForTimeout(100);

    await page.screenshot({ path: "test-results/zoom-resize-04-after-wait.png" });

    // Check root position
    const afterResizePos = await orgChart.getNodePosition("John Smith");
    console.log("After resize:", afterResizePos);

    // The root should STILL be near the top (in the scaled TopBar)
    // At scale 0.2, target is ~6px, so allow some tolerance
    expect(
      afterResizePos.y,
      `Root left scaled top bar! Position: y=${afterResizePos.y}, expected y < 15 (scaled bar)`
    ).toBeLessThan(15);
  });

  test("root stays in scaled top bar with extreme height reduction at min zoom", async ({ page }) => {
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

    // Test at multiple zoom levels
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

      // Root Y should stay approximately the same (within tolerance)
      const yDiff = Math.abs(afterPos.y - beforePos.y);
      expect(
        yDiff,
        `${name}: Root moved too much during resize! Before: ${beforePos.y}, After: ${afterPos.y}`
      ).toBeLessThan(5);
    }
  });

  test("root stays in top bar after width decrease when fully zoomed in", async ({ page }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    // Take baseline screenshot
    await page.screenshot({ path: "test-results/zoom-in-resize-01-initial.png" });
    const initialPos = await orgChart.getNodePosition("John Smith");
    console.log("Initial position:", initialPos);

    // Zoom IN completely - scroll up to increase scale
    const canvas = page.locator("canvas");
    await canvas.hover();
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, -1000); // Negative = zoom in
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(300);

    await page.screenshot({ path: "test-results/zoom-in-resize-02-zoomed-in.png" });
    const zoomedInPos = await orgChart.getNodePosition("John Smith");
    console.log("After zoom in:", zoomedInPos);

    // At max zoom (2.0), TopBar is 120px, root should be at ~60px
    expect(zoomedInPos.y, "Root should be in scaled top bar when zoomed in").toBeLessThan(TOP_BAR_HEIGHT * 2 + 10);

    // Simulate opening developer tools on the side - reduce WIDTH
    await page.setViewportSize({ width: 900, height: 720 });

    // Take screenshot immediately after resize
    await page.screenshot({ path: "test-results/zoom-in-resize-03-immediate.png" });

    // Wait for any async operations
    await page.waitForTimeout(100);

    await page.screenshot({ path: "test-results/zoom-in-resize-04-after-wait.png" });

    // Check root position
    const afterResizePos = await orgChart.getNodePosition("John Smith");
    console.log("After width resize:", afterResizePos);

    // Root Y should stay approximately the same (within tolerance)
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
      await page.mouse.wheel(0, -2000); // Negative = zoom in
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

    // Root Y should stay approximately the same
    const yDiff = Math.abs(afterPos.y - beforePos.y);
    expect(
      yDiff,
      `Root moved during width resize! Before: ${beforePos.y}, After: ${afterPos.y}`
    ).toBeLessThan(5);
  });
});
