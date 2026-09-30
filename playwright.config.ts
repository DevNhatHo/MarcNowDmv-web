import { defineConfig, devices } from "@playwright/test";

/**
 * Browser review tooling for the visual completion gate.
 *
 * The two viewports are the ones the design plan requires every visual ticket to inspect:
 * 360×800 mobile and 1280×900 desktop. The installed system Chrome is used through the
 * `chrome` channel, so no browser binaries are downloaded into the repository or the cache.
 *
 * Specs run against a production build rather than the development server, because that is
 * what the design review actually judges. Vitest owns `tests/**\/*.test.ts(x)`; Playwright
 * owns `tests/e2e/**\/*.spec.ts`, so the two runners never collect each other's files.
 */
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "line" : [["list"]],
  use: { baseURL, channel: "chrome" },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run build && npm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
