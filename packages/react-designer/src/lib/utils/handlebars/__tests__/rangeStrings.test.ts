import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

/**
 * `range` recurses on `start + step`, so a STRING start concatenates — "1",
 * "11", "111" — and never reaches the end. Measured on dev (H10 of the
 * 2026-09-29 audit): "Maximum call stack size exceeded". `assertIsNumber` is
 * only an `isNaN`, so the numeric string passes it unconverted.
 */
describe("range given a string", () => {
  it("blocks on a literal", () => {
    const issue = validateHandlebars('[{{#each (range "1" "3")}}{{this}}{{/each}}]').find(
      (i) => i.code === "bad-literal-argument"
    );
    expect(issue).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
    expect(issue!.message).toContain("never finishes");
  });

  it("blocks whichever argument it is", () => {
    for (const text of ['[{{range "3"}}]', '[{{range 1 "3"}}]', '[{{range 1 9 "2"}}]']) {
      expect(
        validateHandlebars(text).map((i) => i.code),
        text
      ).toContain("bad-literal-argument");
    }
  });

  it("fails the preview rather than hanging the editor", () => {
    resetPreviewEnv();
    const result = renderHandlebarsPreview('[{{#each (range "1" "3")}}{{this}}{{/each}}]', {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain("never terminates");
  });

  it("leaves a numeric range alone", () => {
    resetPreviewEnv();
    expect(validateHandlebars("[{{#each (range 1 3)}}{{this}}{{/each}}]")).toEqual([]);
    expect(renderHandlebarsPreview("[{{#each (range 1 3)}}{{this}}{{/each}}]", {}).text).toBe(
      "[12]"
    );
  });

  it("says nothing about a range whose bounds arrive in the data", () => {
    // Unknowable here: the value may well be a number.
    expect(validateHandlebars("[{{#each (range data.a data.b)}}x{{/each}}]")).toEqual([]);
  });
});

/**
 * The guard is about the RECURSION, not about strings in general. `range`
 * recurses on `start + step`, so only those two concatenate; the stop is merely
 * compared, and `<` coerces a numeric string. Measured on dev, H51 of the same
 * audit: `{{#each (range data.h.s5)}}` with `s5` = the string `"5"` renders
 * `01234`, and the whole H51 line sends as
 * `012|123|0369||53|01234`.
 *
 * Over-reading the guard failed the whole field instead, so H51 previewed empty
 * on email, SMS and push while the send was correct.
 */
describe("range given a numeric string from the data", () => {
  const data = { data: { h: { s5: "5" } } };

  it("renders the stop as a number, as the send does", () => {
    resetPreviewEnv();
    const result = renderHandlebarsPreview("{{#each (range data.h.s5)}}{{this}}{{/each}}", data);
    expect(result.ok, result.error).toBe(true);
    expect(result.text).toBe("01234");
  });

  it("renders every arm of H51 the way the send does", () => {
    resetPreviewEnv();
    const text = [
      "{{#each (range 3)}}{{this}}{{/each}}",
      "{{#each (range 1 4)}}{{this}}{{/each}}",
      "{{#each (range 0 10 3)}}{{this}}{{/each}}",
      "{{#each (range 5 0 -1)}}{{this}}{{/each}}",
      "{{#each (range 5 1 -2)}}{{this}}{{/each}}",
      "{{#each (range data.h.s5)}}{{this}}{{/each}}",
    ].join("|");
    const result = renderHandlebarsPreview(text, data);
    expect(result.ok, result.error).toBe(true);
    expect(result.text).toBe("012|123|0369||53|01234");
  });

  it("still fails where the START is a string, which is what never terminates", () => {
    resetPreviewEnv();
    expect(renderHandlebarsPreview("{{#each (range data.h.s5 9)}}{{this}}{{/each}}", data).ok).toBe(
      false
    );
    expect(
      renderHandlebarsPreview("{{#each (range 1 9 data.h.s5)}}{{this}}{{/each}}", data).ok
    ).toBe(false);
  });
});
