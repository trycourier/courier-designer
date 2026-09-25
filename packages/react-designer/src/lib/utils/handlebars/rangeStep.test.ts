import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview } from "./renderPreview";
import { validateHandlebars } from "./validateHandlebars";

/**
 * The backend's `range` recurses on `range(start + step, end, step)` with no
 * guard for a step of 0 (`handlebars/helpers/universal/array/range.ts`), so
 * `{{#each (range 0 5 0)}}` dies with "Maximum call stack size exceeded" and
 * the send fails. Preview quietly rendered nothing, which told the author the
 * template was fine.
 */
describe("range with a step of zero", () => {
  it("is flagged as blocking when the step is written in the template", () => {
    const [issue] = validateHandlebars("{{#each (range 0 5 0)}}x{{/each}}");
    expect(issue).toMatchObject({ code: "range-step", severity: "error" });
    expect(issue.message).toMatch(/step/i);
  });

  it("fails the preview too, so a step that comes from data is caught", () => {
    const result = renderHandlebarsPreview("{{#each (range 0 5 step)}}x{{/each}}", { step: 0 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/step/i);
  });

  it("leaves a range that terminates alone", () => {
    expect(validateHandlebars("{{#each (range 0 5 1)}}x{{/each}}")).toEqual([]);
    expect(validateHandlebars("{{#each (range 5 0 -1)}}x{{/each}}")).toEqual([]);
    expect(validateHandlebars("{{#each (range 5)}}x{{/each}}")).toEqual([]);
    expect(renderHandlebarsPreview("{{#each (range 0 3)}}x{{/each}}", {}).ok).toBe(true);
  });

  it("leaves a zero step alone where the backend returns an empty list instead", () => {
    // `start === end` and `end === 0` both return [] before the recursion, so
    // they send fine and must not be flagged.
    expect(validateHandlebars("{{#each (range 3 3 0)}}x{{/each}}")).toEqual([]);
    expect(validateHandlebars("{{#each (range 3 0 0)}}x{{/each}}")).toEqual([]);
  });
});
