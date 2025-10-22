import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1, // Reduce retries in CI to save time
  workers: 4, // Use 4 workers in both CI and local for consistent performance
  reporter: process.env.CI ? "github" : "html",
  timeout: process.env.CI ? 60000 : 90000, // 60s in CI, 90s locally
  maxFailures: process.env.CI ? 3 : undefined, // Fail fast in CI after 3 failures
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry", // Only trace on failure in CI
    actionTimeout: 15000,
    navigationTimeout: 30000,
    storageState: undefined,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: {
          storageState: undefined,
        },
      },
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],
  webServer: {
    command: process.env.CI
      ? "cd ../../apps/editor-dev && VITE_API_URL='https://api.courier.com/client/q' VITE_TEMPLATE_ID='test-template' VITE_TENANT_ID='test-tenant' VITE_JWT_TOKEN='test-token' pnpm dev"
      : "cd ../../apps/editor-dev && pnpm dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
