import { test, expect } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";

/**
 * These tests verify that the top bar highlights when a node's bounding box
 * intersects it, not just when the node's center is inside.
 *
 * The issue: hover only activates when the node is deep inside the top bar.
 * Expected: hover should activate as soon as the node intersects the top bar.
 */

test.describe("Top Bar Hover Detection", () => {
  test("top bar highlights when node's top edge enters it (before center)", async ({ page }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    const topBar = page.locator('[data-testid="top-bar"]');

    // Get the actual top bar height from the DOM (scaled based on current zoom)
    const barHeight = await topBar.evaluate((el) => el.getBoundingClientRect().height);
    console.log("Actual top bar height:", barHeight);

    // Get a free node position
    const freeNodePos = await orgChart.getNodePosition("Jennifer Taylor");
    console.log("Free node position:", freeNodePos);

    // Target Y where node's top edge should be in the top bar but center is below
    // At the current scale, we need to position the node so its top edge is inside the bar.
    // Node visual height is approximately 30-40px at scale 1.0, scaled proportionally.
    // We'll position the center such that top edge is 5px inside the bar.
    // Estimate node half-height as barHeight/3 (scales with zoom)
    const nodeHalfHeight = barHeight / 3;
    const targetY = barHeight - 5 + nodeHalfHeight; // Top edge at barHeight-5

    console.log("Target Y for center:", targetY, "Expected top edge:", targetY - nodeHalfHeight);

    // Drag in steps to trigger proper vis-network events
    await page.mouse.move(freeNodePos.x, freeNodePos.y);
    await page.mouse.down();

    // Move in steps toward the target
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      const y = freeNodePos.y + ((targetY - freeNodePos.y) * i) / steps;
      await page.mouse.move(freeNodePos.x, y);
      await page.waitForTimeout(20);
    }

    // Wait a moment for state to update
    await page.waitForTimeout(100);

    // Take screenshot to see current state
    await page.screenshot({ path: "test-results/top-bar-hover-01-edge-inside.png" });

    // Check the highlight state while still dragging
    const isHighlighted = await topBar.getAttribute("data-highlighted");
    console.log(`Highlight state:`, isHighlighted);

    // Get actual node position during drag
    const currentPos = await orgChart.getNodePosition("Jennifer Taylor");
    console.log("Node position during drag:", currentPos);

    expect(
      isHighlighted,
      `Top bar should highlight when node's top edge enters it. Node center at y=${currentPos.y}, bar height=${barHeight}`
    ).toBe("true");

    await page.mouse.up();
  });

  test("top bar highlights when node center is clearly inside", async ({ page }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    const topBar = page.locator('[data-testid="top-bar"]');

    const freeNodePos = await orgChart.getNodePosition("Jennifer Taylor");
    console.log("Free node start position:", freeNodePos);

    // Target: center clearly inside the 60px top bar
    const targetY = 30; // Center of top bar

    // Drag in steps
    await page.mouse.move(freeNodePos.x, freeNodePos.y);
    await page.mouse.down();

    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      const y = freeNodePos.y + ((targetY - freeNodePos.y) * i) / steps;
      await page.mouse.move(freeNodePos.x, y);
      await page.waitForTimeout(20);
    }

    await page.waitForTimeout(100);
    await page.screenshot({ path: "test-results/top-bar-hover-02-center-inside.png" });

    const isHighlighted = await topBar.getAttribute("data-highlighted");
    const currentPos = await orgChart.getNodePosition("Jennifer Taylor");
    console.log(`Node at y=${currentPos.y}, highlight:`, isHighlighted);

    expect(
      isHighlighted,
      `Top bar should highlight when node center is at y=${currentPos.y} (inside 60px bar)`
    ).toBe("true");

    await page.mouse.up();
  });

  test("top bar does NOT highlight when node is clearly below it", async ({ page }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    const topBar = page.locator('[data-testid="top-bar"]');

    const freeNodePos = await orgChart.getNodePosition("Jennifer Taylor");

    // Target: clearly below the top bar (node top edge would be at ~130px, way below 60px bar)
    const targetY = 150;

    await page.mouse.move(freeNodePos.x, freeNodePos.y);
    await page.mouse.down();

    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const y = freeNodePos.y + ((targetY - freeNodePos.y) * i) / steps;
      await page.mouse.move(freeNodePos.x, y);
      await page.waitForTimeout(20);
    }

    await page.waitForTimeout(100);

    const isHighlighted = await topBar.getAttribute("data-highlighted");
    const currentPos = await orgChart.getNodePosition("Jennifer Taylor");
    console.log(`Node at y=${currentPos.y}, highlight:`, isHighlighted);

    expect(
      isHighlighted,
      "Top bar should NOT highlight when node is clearly below it"
    ).toBe("false");

    await page.mouse.up();
  });

  test("top bar highlights at boundary - node just touching bar", async ({ page }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    const topBar = page.locator('[data-testid="top-bar"]');

    // Get the actual top bar height from the DOM (scaled based on current zoom)
    const barHeight = await topBar.evaluate((el) => el.getBoundingClientRect().height);
    console.log("Actual top bar height:", barHeight);

    const freeNodePos = await orgChart.getNodePosition("Jennifer Taylor");
    console.log("Free node position:", freeNodePos);

    // Target: node's top edge just barely inside the top bar (2px inside)
    // Estimate node half-height as barHeight/3 (scales with zoom)
    const nodeHalfHeight = barHeight / 3;
    const targetY = barHeight - 2 + nodeHalfHeight; // Top edge 2px inside bar

    console.log("Target Y for center:", targetY, "Expected top edge:", targetY - nodeHalfHeight);

    await page.mouse.move(freeNodePos.x, freeNodePos.y);
    await page.mouse.down();

    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      const y = freeNodePos.y + ((targetY - freeNodePos.y) * i) / steps;
      await page.mouse.move(freeNodePos.x, y);
      await page.waitForTimeout(20);
    }

    await page.waitForTimeout(100);
    await page.screenshot({ path: "test-results/top-bar-hover-03-boundary.png" });

    const isHighlighted = await topBar.getAttribute("data-highlighted");
    const currentPos = await orgChart.getNodePosition("Jennifer Taylor");
    console.log(`Boundary test - Node at y=${currentPos.y}, highlight:`, isHighlighted);

    // This is the key test - the node's top edge should be just inside the bar
    expect(
      isHighlighted,
      `Top bar should highlight when node's top edge touches bar. Node center at y=${currentPos.y}, bar height=${barHeight}`
    ).toBe("true");

    await page.mouse.up();
  });
});
