import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load full-cycle environment variables into process.env
const envPath = path.resolve(__dirname, ".env.fullcycle");
dotenv.config({ path: envPath });

// Collect VITE_* vars to forward to the dev server
const viteEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("VITE_") && value) {
    viteEnv[key] = value;
  }
}

/**
 * Playwright config for full-cycle E2E tests.
 *
 * These tests connect to the real Courier API (prod) and verify the complete
 * pipeline: Designer → Save → Publish → Send → Render → Verify.
 *
 * Usage:
 *   pnpm test:e2e:fullcycle
 *   # or directly:
 *   npx playwright test --config=playwright.fullcycle.config.ts
 */
export default defineConfig({
  testDir: "./e2e/full-cycle",
  globalTeardown: "./e2e/full-cycle/global-teardown.ts",
  fullyParallel: false, // Run sequentially – these hit real APIs
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries – these are slow integration tests
  workers: 1, // Single worker – avoid API rate limits
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 120_000, // 2 min per test (network calls + polling)
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // 1% threshold (same-engine, should be near-identical)
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://localhost:5174", // Separate port to avoid conflicts with regular dev server
    trace: "off", // Traces add noise; failed tests attach comparison images directly
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "cd ../../apps/editor-dev && pnpm dev --port 5174",
    port: 5174,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Forward VITE_* env vars from .env.fullcycle to the Vite dev server
    // so FullCycleTestApp picks up the correct tenant/template/token
    env: {
      ...process.env as Record<string, string>,
      ...viteEnv,
    },
  },
});
