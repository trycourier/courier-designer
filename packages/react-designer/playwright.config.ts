import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 4, // Use 4 workers in both CI and local for consistent performance
  reporter: process.env.CI ? "github" : "html",
  timeout: 90000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
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
    command: "cd ../../apps/editor-dev && pnpm dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
