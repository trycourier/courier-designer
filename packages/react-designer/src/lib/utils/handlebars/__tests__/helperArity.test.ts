import { describe, expect, it } from "vitest";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

/**
 * Calls that are wrong on their face — no data needed to know they fail. Every
 * send error in the comments was measured on dev (audit run 20260928).
 */
const BLOCKED: [string, string, string][] = [
  [
    "H04 an else chain with two values",
    "{{#if data.h.t}}a{{else if data.h.t data.h.f}}b{{/if}}",
    "if-arity",
  ],
  ["H09 each with no iterator", "{{#each}}x{{/each}}", "helper-arity"],
  [
    "H27 filter short of an operator",
    '{{#if (filter "data" "data.h.n3")}}Y{{/if}}',
    "helper-arity",
  ],
  ["H29 default with no fallback", "[{{default}}]", "helper-arity"],
  ["H43 add with one operand", "[{{add 5}}]", "helper-arity"],
  ["H48 range with no bound", "[{{range}}]", "helper-arity"],
  ["H49 datetime-format with no format", "[{{datetime-format data.h.iso}}]", "helper-arity"],
  ["H24 contains called inline", '[{{contains data.h.msg "x"}}]', "inline-block-helper"],
  ["H16 condition short of operand2", "{{#if (condition data.h.n3)}}Y{{/if}}", "condition-arity"],
];

describe("a call that cannot work whatever the data", () => {
  it.each(BLOCKED)("%s blocks", (_label, text, code) => {
    const issue = validateHandlebars(text).find((i) => i.code === code);
    expect(issue, `${text} → ${validateHandlebars(text).map((i) => i.code)}`).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
  });

  it("leaves a call the send survives alone", () => {
    for (const text of [
      // The options hash fills the missing slot and `default` just returns the
      // value, so this delivers.
      "[{{default data.x}}]",
      "[{{add 5 3}}]",
      "[{{range 3}}]",
      // `yyyy`, not `YYYY`: date-fns rejects the week-year token and so does the send.
      '[{{datetime-format data.iso "yyyy"}}]',
      '{{#contains data.msg "x"}}Y{{/contains}}',
      "{{#each data.items}}x{{/each}}",
      "{{#if data.t}}a{{else if data.f}}b{{/if}}",
      '{{#if (filter "data" "data.x" "CONTAINS" "y")}}Y{{/if}}',
      '{{#if (condition data.a "==" data.b)}}Y{{/if}}',
    ]) {
      expect(validateHandlebars(text), text).toEqual([]);
    }
  });
});
