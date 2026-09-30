import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

const DATA = {
  data: {
    h: { arr: [1, 2], name: "n", words: "a b", n: 4, s: "ab", json: '{"a":1}' },
  },
};

/**
 * Calls short of the arguments the renderer asserts on. Each was measured
 * throwing at send in the 2026-09-29 audit, or probed against the preview
 * helpers, which mirror the renderer; the whole math and string family is here
 * rather than only the four the audit happened to cover.
 */
const TOO_FEW: [string, string][] = [
  ["round with nothing", "[{{round}}]"],
  ["abs with nothing", "[{{abs}}]"],
  ["ceil with nothing", "[{{ceil}}]"],
  ["floor with nothing", "[{{floor}}]"],
  ["add with one operand", "[{{add data.h.n}}]"],
  ["capitalize with nothing", "[{{capitalize}}]"],
  ["split with no delimiter", "[{{#each (split data.h.words)}}x{{/each}}]"],
  ["format with nothing", "[{{format}}]"],
  ["json-parse with nothing", "[{{json-parse}}]"],
  ["parse-string with nothing", "[{{parse-string}}]"],
  ["path with nothing", "[{{path}}]"],
  ["var with nothing", "[{{var}}]"],
  ["inline-var with nothing", "[{{inline-var}}]"],
  ["set with nothing", "[{{set}}]"],
  ["replace-all with no replacement", '[{{#replace-all "o"}}foo{{/replace-all}}]'],
  // "#contains requires substring" — measured on dev, H02 of the 2026-09-29
  // audit. One argument still delivers, which is the row below.
  ["contains with nothing at all", "[{{#contains}}Y{{else}}N{{/contains}}]"],
];

describe("a call the renderer asserts its way out of", () => {
  it.each(TOO_FEW)("%s blocks", (_label, text) => {
    const issue = validateHandlebars(text).find((i) => i.code === "helper-arity");
    expect(issue, `${text} → ${validateHandlebars(text).map((i) => i.code)}`).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
  });

  it.each(TOO_FEW)("%s also fails the preview, as it fails the send", (_label, text) => {
    resetPreviewEnv();
    expect(renderHandlebarsPreview(text, DATA).ok, text).toBe(false);
  });

  // `{{#each list extra}}` puts the options hash beyond where `each` looks for
  // it: measured "fn is not a function".
  it("blocks a second argument to each", () => {
    const issue = validateHandlebars("[{{#each data.h.arr data.h.name}}x{{/each}}]").find(
      (i) => i.code === "helper-arity"
    );
    expect(issue).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
    expect(issue!.message).toContain("further one");
  });

  it("leaves the calls that work alone", () => {
    for (const text of [
      "[{{round data.h.n}}]",
      "[{{add data.h.n 2}}]",
      "[{{capitalize data.h.words}}]",
      '[{{#each (split data.h.words " ")}}x{{/each}}]',
      '[{{#replace-all "o" "0"}}foo{{/replace-all}}]',
      "[{{#each data.h.arr}}x{{/each}}]",
      // These take the options hash happily and deliver.
      "[{{inc}}]",
      "[{{concat}}]",
      "[{{truncate data.h.words}}]",
      // One argument is the P-03 case: the hash becomes the substring, the
      // block takes its else branch and the send delivers.
      "[{{#contains data.h.words}}Y{{else}}N{{/contains}}]",
    ]) {
      expect(
        validateHandlebars(text).filter((i) => i.code === "helper-arity"),
        text
      ).toEqual([]);
    }
  });

  it("previews replace-all's missing replacement the way the send fails it", () => {
    resetPreviewEnv();
    const result = renderHandlebarsPreview('[{{#replace-all "o"}}foo{{/replace-all}}]', DATA);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("must have a replace value");
  });
});
