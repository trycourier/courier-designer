import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

// Comments are stripped first: the ones in this rule quote CSS, braces included,
// so a naive scan for the closing brace would stop inside a comment.
const css = fs
  .readFileSync(path.join(__dirname, "typography.css"), "utf-8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations inside the `a.link` block. */
const linkBlock = (() => {
  const start = css.indexOf("a.link {");
  if (start === -1) throw new Error("a.link rule not found in typography.css");
  const end = css.indexOf("}", start);
  return css.slice(start, end);
})();

describe("typography.css a.link", () => {
  /**
   * A host's global `a { … }` rule beats inheritance on every link in the
   * editor, because any matching declaration wins over an inherited value.
   * Studio's legacy ThemeWrapper ships `a { color: #2a9edb; font-weight: 500;
   * text-decoration: none }`, so each of those three properties has to be
   * stated here or the editor renders the host's value — which is how a link
   * inside an h1 ended up lighter (500) than the heading around it (600).
   */
  it("states every property studio's global anchor rule sets", () => {
    expect(linkBlock).toMatch(/font-weight:\s*inherit/);
    expect(linkBlock).toMatch(/color:\s*var\(--brand-link-color/);
    expect(linkBlock).toMatch(/courier-no-underline/);
  });
});
