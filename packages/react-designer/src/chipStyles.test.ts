import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const chipCssPath = path.resolve(__dirname, "../dist/chip-styles.css");
const hasBuild = fs.existsSync(chipCssPath);

/**
 * `chip-styles.css` is injected into an email preview iframe. Tailwind's
 * preflight in there would strip the customer's table borders, link colours and
 * underlines, so the preview would stop showing what the send looks like —
 * which is the one thing it exists to do.
 */
describe.skipIf(!hasBuild)("chip-styles.css", () => {
  const css = hasBuild ? fs.readFileSync(chipCssPath, "utf8") : "";

  it("carries the chip rules the markup depends on", () => {
    for (const selector of [
      ".courier-variable-chip",
      ".courier-handlebars-chip",
      "courier-handlebars-chip-invalid",
      "courier-handlebars-chip-comment",
      ".courier-flex-shrink-0",
      ".courier-items-center",
    ]) {
      expect(css, selector).toContain(selector);
    }
  });

  it("carries no preflight, so it cannot restyle the previewed email", () => {
    expect(css).not.toMatch(/^\*\s*,/m);
    expect(css).not.toMatch(/^body\s*\{/m);
    expect(css).not.toMatch(/^a\s*\{/m);
    expect(css).not.toContain("::backdrop");
  });

  it("stays small enough to inline, unlike the full sheet", () => {
    expect(css.length).toBeLessThan(64 * 1024);
  });

  it("styles the label for both renderers, not just the React one", () => {
    // These rules were inline on the React chip, so a string chip got none of
    // them and its label inherited the surrounding email's layout.
    expect(css).toContain(".courier-variable-chip > span:last-child");
    expect(css).toContain(".courier-handlebars-chip > span:last-child");
    // The label grows sideways to a cap, then wraps — ellipsing at 24ch hid the
    // end of a helper signature. A literal newline is prevented by normalising
    // the label text, not by `nowrap`, since wrapping needs `white-space: normal`.
    for (const decl of ["white-space: normal", "overflow: hidden", "-webkit-line-clamp: 3"]) {
      expect(css, decl).toContain(decl);
    }
    expect(css).not.toContain("white-space: nowrap");
  });
});
