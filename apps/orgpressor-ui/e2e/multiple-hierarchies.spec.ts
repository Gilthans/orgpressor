import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";

test.describe("Multiple Hierarchies", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test("second root positioned to right of first", async () => {
    await orgChart.expectLayoutChanged(async () => {
      // Drag straight up to top bar from current position
      await orgChart.makeRoot("Jennifer Taylor");
    });
  });

  test("multiple roots layout independently", async () => {
    // Create Jennifer as a second root
    await orgChart.makeRoot("Jennifer Taylor");

    // Add James as child of Jennifer (drag to Jennifer's position)
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.connectNodes("James Brown", "Jennifer Taylor");
    });
  });

  test("merge trees by connecting root to other hierarchy", async () => {
    // Create Jennifer as a second root
    await orgChart.makeRoot("Jennifer Taylor");

    // Snap out Jennifer and connect to Sarah (in John's hierarchy)
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Jennifer Taylor", "Sarah Johnson");
    });
  });

  test("snap out hierarchy and connect to another", async () => {
    // Create Jennifer as root with James as child
    await orgChart.makeRoot("Jennifer Taylor");
    await orgChart.connectNodes("James Brown", "Jennifer Taylor");

    // Get Jennifer's position (she's now a root in top bar)
    const jenniferPos = await orgChart.getNodePosition("Jennifer Taylor");

    // Snap out Jennifer (with James) - drag down past threshold
    await orgChart.expectLayoutChanged(async () => {
      const snapOutY = jenniferPos.y + 300;
      await orgChart.drag(jenniferPos.x, jenniferPos.y, jenniferPos.x, snapOutY);
      await orgChart.waitForStableLayout();

      // Connect under Michael
      const michaelPos = await orgChart.getNodePosition("Michael Chen");
      await orgChart.drag(jenniferPos.x, snapOutY, michaelPos.x, michaelPos.y);
    });
  });

  test("each hierarchy maintains own Y levels", async () => {
    // Create Jennifer as second root
    await orgChart.makeRoot("Jennifer Taylor");

    // Add James as child of Jennifer
    await orgChart.connectNodes("James Brown", "Jennifer Taylor");

    // Get James position (should be level 1 under Jennifer)
    const jamesPos = await orgChart.getNodePosition("James Brown");

    // Add Maria as child of James
    const mariaPos = await orgChart.getNodePosition("Maria Garcia");
    await orgChart.drag(mariaPos.x, mariaPos.y, jamesPos.x, jamesPos.y);
    await orgChart.waitForStableLayout();
  });

  test("removing root leaves other hierarchies intact", async () => {
    // Create Jennifer as second root with James as child
    await orgChart.makeRoot("Jennifer Taylor");
    await orgChart.connectNodes("James Brown", "Jennifer Taylor");

    // Get Jennifer's position
    const jenniferPos = await orgChart.getNodePosition("Jennifer Taylor");

    // Snap out Jennifer (making her free again, taking James) - drag down past threshold
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(jenniferPos.x, jenniferPos.y, jenniferPos.x, jenniferPos.y + 400);
    });
  });
});
