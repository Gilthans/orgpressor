import { test, expect } from "@playwright/test";

test.describe("App", () => {
  test("loads without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");

    // Wait for the graph container to be visible
    await expect(page.locator("div").first()).toBeVisible();

    // Give the app time to initialize
    await page.waitForTimeout(500);

    expect(consoleErrors).toEqual([]);
  });
});
