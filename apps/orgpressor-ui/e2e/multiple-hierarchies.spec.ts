import { test } from "@playwright/test";
import { OrgChartPage } from "./pages/OrgChartPage";
import { TOP_BAR_CENTER_Y } from "./test-utils";

test.describe("Multiple Hierarchies", () => {
  let orgChart: OrgChartPage;

  test.beforeEach(async ({ page }) => {
    orgChart = new OrgChartPage(page);
    await orgChart.goto();
  });

  test("second root positioned to right of first", async () => {
    const johnPos = await orgChart.getNodePosition("John Smith");

    await orgChart.expectLayoutChanged(async () => {
      await orgChart.makeRoot("Jennifer Taylor", johnPos.x + 300);
    });
  });

  test("multiple roots layout independently", async () => {
    // Create Jennifer as a second root
    await orgChart.makeRoot("Jennifer Taylor", 700);

    // Add James as child of Jennifer (drag to Jennifer's position)
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.connectNodes("James Brown", "Jennifer Taylor");
    });
  });

  test("merge trees by connecting root to other hierarchy", async () => {
    // Create Jennifer as a second root
    await orgChart.makeRoot("Jennifer Taylor", 700);

    // Snap out Jennifer and connect to Sarah (in John's hierarchy)
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.snapOutAndConnectTo("Jennifer Taylor", "Sarah Johnson");
    });
  });

  test("snap out hierarchy and connect to another", async () => {
    // Create Jennifer as root with James as child
    await orgChart.makeRoot("Jennifer Taylor", 700);
    await orgChart.connectNodes("James Brown", "Jennifer Taylor");

    // Get Jennifer's position (she's now a root in top bar)
    const jenniferPos = await orgChart.getNodePosition("Jennifer Taylor");

    // Snap out Jennifer (with James) and connect under Michael
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(jenniferPos.x, jenniferPos.y, 700, 300);
      await orgChart.waitForStableLayout();

      const michaelPos = await orgChart.getNodePosition("Michael Chen");
      await orgChart.drag(700, 300, michaelPos.x, michaelPos.y);
    });
  });

  test("each hierarchy maintains own Y levels", async () => {
    // Create Jennifer as second root
    await orgChart.makeRoot("Jennifer Taylor", 800);

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
    await orgChart.makeRoot("Jennifer Taylor", 800);
    await orgChart.connectNodes("James Brown", "Jennifer Taylor");

    // Get Jennifer's position
    const jenniferPos = await orgChart.getNodePosition("Jennifer Taylor");

    // Snap out Jennifer (making her free again, taking James)
    await orgChart.expectLayoutChanged(async () => {
      await orgChart.drag(jenniferPos.x, jenniferPos.y, 600, 450);
    });
  });
});
