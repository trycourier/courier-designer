import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test-setup.ts"],
    css: true,
    exclude: ["**/e2e/**", "**/node_modules/**"],
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "json-summary"],
      reportsDirectory: "./coverage",
      // Files to include in coverage
      include: ["src/**/*.{ts,tsx}"],
      // Files to exclude from coverage
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/index.ts",
        "src/**/*.d.ts",
        "src/types/**",
      ],
      // Coverage thresholds - will fail if coverage drops below these
      statements: 45,
      branches: 75,
      functions: 35,
      lines: 45,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
