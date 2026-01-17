import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { VIEWPORT } from "./test-utils";

test.describe("Resize Behavior", () => {
  test("root nodes stay in top bar after viewport height decrease", async ({ page }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    // Take initial snapshot
    await page.screenshot({ path: "test-results/resize-height-1-initial.png", fullPage: true });

    // Simulate dev tools opening at bottom by reducing viewport height
    const newHeight = VIEWPORT.height - 200;
    await page.setViewportSize({ width: VIEWPORT.width, height: newHeight });

    // Wait for resize to be processed
    await page.waitForTimeout(100);
    await orgChart.waitForStableLayout(500);

    // Take screenshot after resize
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

    // Take initial snapshot
    await page.screenshot({ path: "test-results/resize-width-1-initial.png", fullPage: true });

    // Simulate dev tools opening on side by reducing viewport width
    const newWidth = VIEWPORT.width - 400;
    await page.setViewportSize({ width: newWidth, height: VIEWPORT.height });

    // Wait for resize to be processed
    await page.waitForTimeout(100);
    await orgChart.waitForStableLayout(500);

    // Take screenshot after resize
    await page.screenshot({ path: "test-results/resize-width-2-after-shrink.png", fullPage: true });

    // Restore the viewport
    await page.setViewportSize(VIEWPORT);
    await page.waitForTimeout(100);
    await orgChart.waitForStableLayout(500);

    await page.screenshot({ path: "test-results/resize-width-3-after-restore.png", fullPage: true });
  });
});
