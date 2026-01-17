import { defineConfig, devices } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get a port for e2e tests. Uses a port file to ensure all workers use the same port.
 * The port file is regenerated if it's older than 1 hour (stale from previous run).
 */
function getTestPort(): string {
  const portFile = path.join(__dirname, ".e2e-port");
  const maxAge = 60 * 60 * 1000; // 1 hour

  // Check if we have a recent port file
  try {
    const stat = fs.statSync(portFile);
    const age = Date.now() - stat.mtimeMs;
    if (age < maxAge) {
      const port = fs.readFileSync(portFile, "utf-8").trim();
      if (port && !isNaN(Number(port))) {
        return port;
      }
    }
  } catch {
    // File doesn't exist or can't be read, will create new one
  }

  // Find an available port using a synchronous subprocess
  const port = execSync(
    `node -e "const s=require('net').createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})"`,
    { encoding: "utf-8" }
  ).trim();

  // Write port to file for other workers to use
  fs.writeFileSync(portFile, port);

  return port;
}

const port = getTestPort();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
