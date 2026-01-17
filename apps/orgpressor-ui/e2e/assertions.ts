import { expect } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_HEIGHT } from "./test-utils";

// =============================================================================
// Custom Assertions for Org Chart
// =============================================================================

/**
 * Assert that a node is a root node.
 */
export async function expectToBeRoot(page: OrgChartPage, nodeLabel: string): Promise<void> {
  const node = await page.getNode(nodeLabel);
  expect(node, `Node "${nodeLabel}" not found`).not.toBeNull();
  expect(node!.isRoot, `Expected "${nodeLabel}" to be a root node`).toBe(true);
}

/**
 * Assert that two nodes are connected (parent -> child).
 */
export async function expectToBeConnected(
  page: OrgChartPage,
  parentLabel: string,
  childLabel: string
): Promise<void> {
  const connected = await page.areConnected(parentLabel, childLabel);
  expect(connected, `Expected "${parentLabel}" -> "${childLabel}" connection`).toBe(true);
}

/**
 * Assert that two nodes are NOT connected.
 */
export async function expectNotToBeConnected(
  page: OrgChartPage,
  parentLabel: string,
  childLabel: string
): Promise<void> {
  const connected = await page.areConnected(parentLabel, childLabel);
  expect(connected, `Expected no "${parentLabel}" -> "${childLabel}" connection`).toBe(false);
}

/**
 * Assert that a node has a specific number of children.
 */
export async function expectChildCount(
  page: OrgChartPage,
  parentLabel: string,
  count: number
): Promise<void> {
  const children = await page.getChildren(parentLabel);
  expect(
    children.length,
    `Expected "${parentLabel}" to have ${count} children, got ${children.length}`
  ).toBe(count);
}

/**
 * Assert that a node is free (not connected to any hierarchy).
 */
export async function expectToBeFree(page: OrgChartPage, nodeLabel: string): Promise<void> {
  const freeNodes = await page.getFreeNodes();
  const isFree = freeNodes.some((n) => n.label === nodeLabel);
  expect(isFree, `Expected "${nodeLabel}" to be a free node`).toBe(true);
}

/**
 * Assert that a node is in the hierarchy (either root or has a parent).
 */
export async function expectToBeInHierarchy(page: OrgChartPage, nodeLabel: string): Promise<void> {
  const [node, freeNodes] = await Promise.all([page.getNode(nodeLabel), page.getFreeNodes()]);
  expect(node, `Node "${nodeLabel}" not found`).not.toBeNull();

  const isFree = freeNodes.some((n) => n.label === nodeLabel);
  expect(isFree, `Expected "${nodeLabel}" to be in hierarchy, but it's free`).toBe(false);
}

/**
 * Assert that a node is positioned in the top bar (root zone).
 */
export async function expectToBeInTopBar(page: OrgChartPage, nodeLabel: string): Promise<void> {
  const node = await page.getNode(nodeLabel);
  expect(node, `Node "${nodeLabel}" not found`).not.toBeNull();
  expect(
    node!.position.y,
    `Expected "${nodeLabel}" to be in top bar (y < ${TOP_BAR_HEIGHT}), got y=${node!.position.y}`
  ).toBeLessThan(TOP_BAR_HEIGHT);
}

/**
 * Assert the total number of root nodes.
 */
export async function expectRootCount(page: OrgChartPage, count: number): Promise<void> {
  const roots = await page.getRootNodes();
  expect(roots.length, `Expected ${count} root nodes, got ${roots.length}`).toBe(count);
}

/**
 * Assert that specific nodes are children of a parent (in any order).
 */
export async function expectChildren(
  page: OrgChartPage,
  parentLabel: string,
  childLabels: string[]
): Promise<void> {
  const children = await page.getChildren(parentLabel);
  const actualLabels = children.map((c) => c.label).sort();
  const expectedLabels = [...childLabels].sort();

  expect(
    actualLabels,
    `Expected "${parentLabel}" to have children [${expectedLabels.join(", ")}], got [${actualLabels.join(", ")}]`
  ).toEqual(expectedLabels);
}
