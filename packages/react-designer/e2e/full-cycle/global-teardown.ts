/**
 * Playwright global teardown: prints a consolidated visual parity report
 * aggregating results from all visual snapshot tests.
 *
 * Each visual test writes a JSON file to test-results/visual-results/.
 * This script reads them all, merges, sorts by diff % descending, and:
 *   1. Prints a table to the console
 *   2. Writes a markdown report to test-results/visual-parity-report.md
 *      (used by CI to post a PR comment and step summary)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.resolve(__dirname, "../../test-results/visual-results");
const REPORT_PATH = path.resolve(__dirname, "../../test-results/visual-parity-report.md");
const MAX_DIFF_PERCENT = 25;

interface ResultEntry {
  name: string;
  element: string;
  diffPercent: number;
  passed: boolean;
}

export default function globalTeardown() {
  if (!fs.existsSync(RESULTS_DIR)) {
    return;
  }

  const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    return;
  }

  // Collect all results
  const allResults: ResultEntry[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), "utf-8"));
      if (Array.isArray(data)) {
        allResults.push(...data);
      }
    } catch {
      // skip malformed files
    }
  }

  if (allResults.length === 0) {
    return;
  }

  // Sort by diffPercent descending
  allResults.sort((a, b) => b.diffPercent - a.diffPercent);

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;

  // ── Console output ──────────────────────────────────────────────────
  const maxElement = Math.max(7, ...allResults.map((r) => r.element.length));
  const maxVariant = Math.max(7, ...allResults.map((r) => r.name.length));
  const diffColWidth = 8;
  const statusColWidth = 6;
  const totalWidth = maxElement + maxVariant + diffColWidth + statusColWidth + 13;

  console.log("");
  console.log("  " + "═".repeat(totalWidth));
  console.log("  VISUAL PARITY REPORT");
  console.log("  " + "─".repeat(totalWidth));
  console.log(
    `  ${"Element".padEnd(maxElement)}  ${"Variant".padEnd(maxVariant)}  ${"Diff %".padStart(diffColWidth)}  Status`
  );
  console.log("  " + "─".repeat(totalWidth));

  for (const r of allResults) {
    const status = r.passed ? "  OK" : "FAIL";
    const icon = r.passed ? "✓" : "✗";
    console.log(
      `  ${r.element.padEnd(maxElement)}  ${r.name.padEnd(maxVariant)}  ${r.diffPercent.toFixed(1).padStart(diffColWidth)}  ${icon} ${status}`
    );
  }

  console.log("  " + "─".repeat(totalWidth));
  console.log(
    `  Total: ${allResults.length} variants | ` +
    `${passed} passed | ${failed} failed | ` +
    `threshold: ${MAX_DIFF_PERCENT}%`
  );
  console.log("  " + "═".repeat(totalWidth));
  console.log("");

  // ── Markdown report (for CI PR comment / step summary) ─────────────
  const statusEmoji = failed > 0 ? "❌" : "✅";
  const lines: string[] = [];
  lines.push(`## ${statusEmoji} Visual Parity Report`);
  lines.push("");
  lines.push(`**${allResults.length}** variants tested | **${passed}** passed | **${failed}** failed | threshold: **${MAX_DIFF_PERCENT}%**`);
  lines.push("");
  lines.push("| Status | Element | Variant | Diff % |");
  lines.push("|:------:|---------|---------|-------:|");
  for (const r of allResults) {
    const icon = r.passed ? "✅" : "❌";
    lines.push(`| ${icon} | ${r.element} | ${r.name} | ${r.diffPercent.toFixed(1)}% |`);
  }

  if (failed > 0) {
    lines.push("");
    lines.push("> **Failed variants exceed the " + MAX_DIFF_PERCENT + "% diff threshold.**");
    lines.push("> Download the `fullcycle-playwright-report` artifact for diff images.");
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join("\n"));

  // Clean up JSON files (they're ephemeral per run)
  for (const file of files) {
    fs.unlinkSync(path.join(RESULTS_DIR, file));
  }
}
