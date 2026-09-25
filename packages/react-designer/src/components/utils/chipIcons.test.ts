import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VARIABLE_ICON_PATHS, variableIconSvg } from "./chipIcons";

/**
 * The React chip renders lucide's `<Braces />`; the HTML-string chip cannot
 * mount a component, so it carries the same path data. A host noticed the two
 * chips drawing different artwork on one page, which is how they learned the
 * renderers were not one component — this keeps a lucide upgrade from splitting
 * them again silently.
 */
describe("chip icons", () => {
  it("matches the installed lucide braces icon", () => {
    const require = createRequire(import.meta.url);
    const bracesPath = path.join(
      path.dirname(require.resolve("lucide-react/package.json")),
      "dist/esm/icons/braces.js"
    );
    const source = fs.readFileSync(bracesPath, "utf8");
    const paths = [...source.matchAll(/d:\s*"([^"]+)"/g)].map((m) => m[1]);

    expect(paths.length, "could not read lucide's path data").toBeGreaterThan(0);
    expect(paths).toEqual([...VARIABLE_ICON_PATHS]);
  });

  it("emits both paths with the caller's colour", () => {
    const svg = variableIconSvg("#5B21B6");
    for (const d of VARIABLE_ICON_PATHS) expect(svg).toContain(d);
    expect(svg).toContain('stroke="#5B21B6"');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });
});
