import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

/**
 * Literals the renderer rejects outright. Each send error was measured on dev
 * (audit run 20260928); the preview already failed on all but the empty
 * `replace-all` search, which it used to render.
 */
const BLOCKED: [string, string][] = [
  ["H31 a reserved name for set", '[{{set "data" 1}}]'],
  ["H37 replace-all with no search", '[{{#replace-all "" "-"}}abc{{/replace-all}}]'],
  ["H38 replace-all with a broken pattern", '[{{#replace-all "(" "-"}}abc{{/replace-all}}]'],
  ["H54 a date format the renderer cannot read", '[{{datetime-format data.iso "%Y %j"}}]'],
  ["H58 a currency code where a format name goes", '[{{formatNumber data.n "USD"}}]'],
];

describe("a literal argument the renderer rejects", () => {
  it.each(BLOCKED)("%s blocks", (_label, text) => {
    const issue = validateHandlebars(text).find((i) => i.code === "bad-literal-argument");
    expect(issue, `${text} → ${validateHandlebars(text).map((i) => i.code)}`).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
  });

  it("leaves a literal the renderer accepts alone", () => {
    for (const text of [
      '[{{set "total" 1}}]',
      '[{{#replace-all "a" "-"}}abc{{/replace-all}}]',
      '[{{datetime-format data.iso "yyyy-MM-dd"}}]',
      '[{{formatNumber data.n style="currency" currency="USD"}}]',
      "[{{formatNumber data.n}}]",
    ]) {
      expect(validateHandlebars(text), text).toEqual([]);
    }
  });

  it("says nothing about a format that arrives in the data", () => {
    expect(validateHandlebars("[{{datetime-format data.iso data.fmt}}]")).toEqual([]);
    expect(validateHandlebars("[{{formatNumber data.n data.fmt}}]")).toEqual([]);
  });

  it("allows a named format inside an intl block, which can define one", () => {
    expect(
      validateHandlebars('{{#intl formats=data.f}}[{{formatNumber data.n "money"}}]{{/intl}}')
    ).toEqual([]);
  });

  it("previews an empty replace-all search the way the send fails it", () => {
    resetPreviewEnv();
    const result = renderHandlebarsPreview('[{{#replace-all "" "-"}}abc{{/replace-all}}]', {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain("must have a search value");
  });
});
