import { test, expect } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_HEIGHT, ROOT_SPACING } from "./test-utils";

test.describe("Multiple DAG Layout", () => {
  test("all root nodes should be aligned at the same Y position in the top bar", async ({
    page,
  }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    // Initial state: John Smith is the only root with a deep hierarchy (3 levels)
    const initialRoots = await orgChart.getRootNodes();
    expect(initialRoots.length).toBe(1);
    expect(initialRoots[0].label).toBe("John Smith");

    // Create a second root (1-level DAG - just root, no children)
    // Position it to the right of existing roots with spacing to avoid connections
    const johnPos = await orgChart.getNodePosition("John Smith");
    await orgChart.makeRoot("Jennifer Taylor", johnPos.x + ROOT_SPACING);

    // Verify we now have 2 roots
    const rootsAfterFirst = await orgChart.getRootNodes();
    expect(rootsAfterFirst.length).toBe(2);

    // Create a third root (also 1-level initially)
    // Position further right to avoid connecting to existing roots
    await orgChart.makeRoot("James Brown", johnPos.x + ROOT_SPACING * 2);

    // Verify we now have 3 roots
    let allRoots = await orgChart.getRootNodes();
    expect(allRoots.length).toBe(3);

    // Connect Maria Garcia to James Brown to create a 2-level DAG
    await orgChart.connectNodes("Maria Garcia", "James Brown");

    // Should still have 3 roots (Maria is now a child, not a root)
    allRoots = await orgChart.getRootNodes();
    expect(allRoots.length).toBe(3);

    // Get positions of all root nodes
    const rootLabels = allRoots.map((r) => r.label);
    expect(rootLabels).toContain("John Smith");
    expect(rootLabels).toContain("Jennifer Taylor");
    expect(rootLabels).toContain("James Brown");

    // KEY ASSERTION: All roots should be at the same Y position
    const rootPositions = allRoots.map((r) => r.position);
    const yPositions = rootPositions.map((p) => p.y);

    // Allow 5px tolerance for rounding
    const tolerance = 5;
    const expectedY = yPositions[0];
    for (let i = 1; i < yPositions.length; i++) {
      expect(
        Math.abs(yPositions[i] - expectedY),
        `Root "${allRoots[i].label}" Y position (${yPositions[i]}) should match first root Y (${expectedY})`
      ).toBeLessThanOrEqual(tolerance);
    }

    // All roots should be within the top bar area
    for (const root of allRoots) {
      expect(
        root.position.y,
        `Root "${root.label}" should be within top bar (y < ${TOP_BAR_HEIGHT})`
      ).toBeLessThan(TOP_BAR_HEIGHT);
    }

    // Take screenshot for visual verification
    await page.screenshot({
      path: "test-results/multi-dag-layout-aligned.png",
      fullPage: true,
    });
  });

  test("roots of DAGs with different depths should align after initial layout", async ({
    page,
  }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    // The existing hierarchy has John Smith at root with:
    // Level 1: Sarah Johnson, Michael Chen
    // Level 2: Emily Davis, Robert Wilson, Lisa Anderson, David Martinez

    // Make Jennifer Taylor a root (will be a 1-level DAG initially)
    // Position to the right of John Smith to avoid accidental connections
    const johnPos = await orgChart.getNodePosition("John Smith");
    await orgChart.makeRoot("Jennifer Taylor", johnPos.x + ROOT_SPACING);

    // Connect William Lee and Amanda White under Jennifer Taylor
    // This creates a 2-level DAG
    await orgChart.connectNodes("William Lee", "Jennifer Taylor");
    await orgChart.connectNodes("Amanda White", "Jennifer Taylor");

    // Get both roots
    const roots = await orgChart.getRootNodes();
    expect(roots.length).toBe(2);

    const johnSmith = roots.find((r) => r.label === "John Smith");
    const jenniferTaylor = roots.find((r) => r.label === "Jennifer Taylor");

    expect(johnSmith).toBeDefined();
    expect(jenniferTaylor).toBeDefined();

    // Both roots should have the same Y position despite different tree depths
    // John Smith: 3 levels deep
    // Jennifer Taylor: 2 levels deep
    const tolerance = 5;
    expect(
      Math.abs(johnSmith!.position.y - jenniferTaylor!.position.y),
      `John Smith (3-level tree) and Jennifer Taylor (2-level tree) should have same Y position`
    ).toBeLessThanOrEqual(tolerance);

    // Take screenshot for visual verification
    await page.screenshot({
      path: "test-results/multi-dag-different-depths.png",
      fullPage: true,
    });
  });

  test("free nodes should be positioned below the hierarchy", async ({
    page,
  }) => {
    const orgChart = new OrgChartPage(page);
    await orgChart.goto();

    // Get free nodes and connected nodes dynamically (no hardcoded IDs)
    const [allNodes, freeNodes] = await Promise.all([
      orgChart.getNodes(),
      orgChart.getFreeNodes(),
    ]);
    expect(freeNodes.length).toBeGreaterThan(0);

    // Connected nodes are all nodes that aren't free
    const freeNodeIds = new Set(freeNodes.map((n) => n.id));
    const connectedNodes = allNodes.filter((n) => !freeNodeIds.has(n.id));
    expect(connectedNodes.length).toBeGreaterThan(0);

    // Calculate hierarchy Y bounds (to verify free nodes are below)
    const hierarchyYs = connectedNodes.map((n) => n.position.y);
    const hierarchyMaxY = Math.max(...hierarchyYs);

    // All free nodes should be below the hierarchy
    const freeNodeYs = freeNodes.map((n) => n.position.y);
    const freeNodesMinY = Math.min(...freeNodeYs);
    expect(
      freeNodesMinY,
      `Free nodes (minY=${freeNodesMinY}) should be below hierarchy (maxY=${hierarchyMaxY})`
    ).toBeGreaterThan(hierarchyMaxY);

    // Take screenshot for visual verification
    await page.screenshot({
      path: "test-results/free-nodes-positioning.png",
      fullPage: true,
    });
  });
});
