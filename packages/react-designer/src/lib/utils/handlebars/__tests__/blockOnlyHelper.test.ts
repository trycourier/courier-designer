import { describe, expect, it } from "vitest";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

const codes = (text: string, channel?: string) =>
  validateHandlebars(text, channel ? { channel } : undefined).map((issue) => issue.code);

/**
 * A block helper reads its body through `options.fn`, which a plain mustache
 * never supplies. Measured on dev: `[{{conditional x}}]` fails the whole send,
 * and `[{{markdown-mark data.s}}]` throws `t.fn is not a function`. Handlebars
 * itself gives no parse error for either — the call is well-formed, it is the
 * shape that is wrong.
 */
describe("a block-only helper written as a plain mustache", () => {
  it.each([
    ["conditional", "[{{conditional data.x}}]"],
    ["markdown-mark", "[{{markdown-mark data.s}}]"],
    ["replace-all", '[{{replace-all "a" "b"}}]'],
    ["contains", '[{{contains data.s "x"}}]'],
    ["each", "[{{each data.items}}]"],
    ["with", "[{{with data.d}}]"],
  ])("blocks %s", (_name, text) => {
    const issue = validateHandlebars(text).find((i) => i.code === "inline-block-helper");
    expect(issue, `${text} → ${codes(text)}`).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
  });

  it("says nothing when it is written as a block", () => {
    for (const text of [
      "[{{#conditional data.x}}Y{{/conditional}}]",
      '[{{#markdown-mark "**"}}m{{/markdown-mark}}]',
      '[{{#replace-all "a" "b"}}banana{{/replace-all}}]',
      "[{{#each data.items}}{{this}}{{/each}}]",
      "[{{#with data.d}}{{name}}{{/with}}]",
      "[{{#if data.x}}Y{{else}}N{{/if}}]",
    ]) {
      expect(codes(text), text).not.toContain("inline-block-helper");
    }
  });

  it("leaves an inline helper that really is inline alone", () => {
    for (const text of [
      "[{{capitalize data.s}}]",
      '[{{condition data.x "==" 1}}]',
      "[{{lookup data.d data.k}}]",
      "[{{data.name}}]",
    ]) {
      expect(codes(text), text).not.toContain("inline-block-helper");
    }
  });

  it("does not fire for a sub-expression, where the value is what is wanted", () => {
    // `{{#if (contains data.s "x")}}` passes contains' RESULT to if, which is
    // how the renderer's own templates call it.
    expect(codes('[{{#if (contains data.s "x")}}Y{{/if}}]')).not.toContain("inline-block-helper");
  });
});
