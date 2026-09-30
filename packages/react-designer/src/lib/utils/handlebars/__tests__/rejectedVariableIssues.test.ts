import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import { collectTemplateIssues } from "../templateIssues";

/**
 * A name the host's validator rejects is a warning the author has to see, and
 * until now it lived only behind the chip's own atoms. Studio counted those in
 * its top bar and the gutter drew no pill for them, so the two disagreed: T1
 * email showed 17 warnings against 6 pills.
 *
 * Here they are ordinary `TemplateIssue`s with the code `rejected-variable`, so
 * the gutter pins them like everything else and a host can count one list.
 */
const content = (text: string) =>
  ({
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", elements: [{ type: "text", content: text }] }],
  }) as unknown as ElementalContent;

// A `data.`/`profile.` prefix rule, the shape a workspace validator takes.
const validate = (name: string) => /^(data|profile)\./.test(name);
const options = { variableValidation: { validate } };

describe("a variable the host's validator rejects", () => {
  it("is reported as a warning, located like any other issue", () => {
    const issues = collectTemplateIssues(content("Hi {{nope}}"), options);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "rejected-variable",
      severity: "warning",
      channel: "email",
      field: "content",
      elementIndex: 0,
      raw: "{{nope}}",
    });
  });

  it("reports one per occurrence, so two bad names are two pills", () => {
    const issues = collectTemplateIssues(content("{{nope}} and {{alsobad}}"), options);
    expect(issues.map((issue) => issue.raw)).toEqual(["{{nope}}", "{{alsobad}}"]);
    expect(new Set(issues.map((issue) => issue.occurrence)).size).toBe(2);
  });

  it("says nothing without a validator, which is today's behaviour", () => {
    expect(collectTemplateIssues(content("Hi {{nope}}"))).toEqual([]);
  });

  it("accepts what the validator accepts", () => {
    expect(collectTemplateIssues(content("Hi {{data.name}}"), options)).toEqual([]);
  });

  it("judges a helper's arguments too", () => {
    const issues = collectTemplateIssues(content("{{capitalize nope}}"), options);
    expect(issues.map((issue) => issue.code)).toEqual(["rejected-variable"]);
  });

  /**
   * The references an enclosing block supplies are never the host's to judge —
   * the same rule the chips follow. These are the shapes the audit found with
   * no pill: D19/D20/D21 style paths and `&data.s.v`.
   */
  it("never asks the host about what a block supplies", () => {
    for (const text of [
      "{{#each data.items}}{{this.name}}{{/each}}",
      "{{#each data.items}}{{@index}}{{/each}}",
      "{{#each data.items}}{{name}}{{/each}}",
      "{{#with data.d}}{{name}}{{/with}}",
      "{{&data.s.v}}",
      "{{data/d/name}}",
    ]) {
      expect(
        collectTemplateIssues(content(text), options).map((i) => i.code),
        text
      ).toEqual([]);
    }
  });

  it("takes its message from the host's describeInvalid when there is one", () => {
    const issues = collectTemplateIssues(content("Hi {{nope}}"), {
      variableValidation: { validate, describeInvalid: (name: string) => `${name} is not a thing` },
    });
    expect(issues[0].message).toBe("nope is not a thing");
  });

  it("falls back to the published list when the host gives no validator", () => {
    const issues = collectTemplateIssues(content("Hi {{data.nope}}"), {
      availableVariables: ["data.name"],
    });
    expect(issues.map((issue) => issue.code)).toEqual(["rejected-variable"]);
  });
});

/**
 * `{{set}}` defines a name for the rest of its own STORED PART, and no further.
 * Measured, and the rule `setScope.ts` already states: `{{set "f" "x"}}{{f}}` in
 * one part renders the value, the same text split across two parts renders
 * nothing, because the send compiles each part on its own.
 *
 * The chips have followed that from the start, through `setDefinedNamesInPart`.
 * The rejected-variable walk did not, and got it backwards in both directions.
 */
describe("a name a set defines", () => {
  const element = (el: Record<string, unknown>) =>
    ({
      version: "2022-01-01",
      elements: [{ type: "channel", channel: "email", elements: [el] }],
    }) as unknown as ElementalContent;

  it("is in scope for the rest of the same part", () => {
    const issues = collectTemplateIssues(
      element({ type: "text", content: '{{set "greet" "hey"}}{{greet}}' }),
      options
    );
    expect(issues.map((issue) => issue.code)).toEqual([]);
  });

  it("is NOT in scope in another part, where the send resolves nothing", () => {
    const issues = collectTemplateIssues(
      element({
        type: "text",
        elements: [
          { type: "string", content: '{{set "func" "hello"}}' },
          { type: "string", content: "{{func}}" },
        ],
      }),
      options
    );
    expect(issues.map((issue) => [issue.code, issue.raw])).toEqual([
      ["rejected-variable", "{{func}}"],
    ]);
  });

  it("is in scope within one part of a run, and not the next", () => {
    const issues = collectTemplateIssues(
      element({
        type: "text",
        elements: [
          { type: "string", content: '{{set "a" "1"}}{{a}}' },
          { type: "string", content: "{{a}}" },
        ],
      }),
      options
    );
    expect(issues.map((issue) => issue.code)).toEqual(["rejected-variable"]);
  });
});

/**
 * `{{var "name"}}` under strict scope is ONE problem, and both checks had
 * something to say about it: `unscoped-path` ("use `data.name`") and
 * `rejected-variable` ("must start with profile., data., …"). Two issues on one
 * expression makes a host count it twice and the pill read "2 warnings".
 *
 * It shows on a text block stored as `string` PARTS — what the editor writes,
 * and where a `var` placeholder gets no second substitution pass — rather than
 * on a plain `content` string. `unscoped-path` wins, since it names the fix.
 */
describe("an expression both checks would report", () => {
  const parts = (...texts: string[]) =>
    ({
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            { type: "text", elements: texts.map((text) => ({ type: "string", content: text })) },
          ],
        },
      ],
    }) as unknown as ElementalContent;

  it("is reported once, as the more actionable of the two", () => {
    const issues = collectTemplateIssues(parts('Hi {{var "name"}}'), options);

    expect(issues.map((issue) => issue.code)).toEqual(["unscoped-path"]);
  });

  it("keeps both when they are about different expressions", () => {
    const issues = collectTemplateIssues(parts('{{var "name"}} and {{nope}}'), options);

    expect(issues.map((issue) => issue.code)).toEqual(["unscoped-path", "rejected-variable"]);
  });

  it("dedupes per part, not per run", () => {
    const issues = collectTemplateIssues(parts("{{nope}}", '{{var "name"}}'), options);

    expect(issues.map((issue) => issue.code)).toEqual(["unscoped-path", "rejected-variable"]);
  });

  it("leaves a bare chip to the rejected check, which is the only one for it", () => {
    const issues = collectTemplateIssues(content("Hi {{name}}"), options);

    expect(issues.map((issue) => issue.code)).toEqual(["rejected-variable"]);
  });

  it("still reports a var path the host rejects but that IS in scope", () => {
    const issues = collectTemplateIssues(parts('{{var "data.nope"}}'), {
      availableVariables: ["data.name"],
    });

    expect(issues.map((issue) => issue.code)).toEqual(["rejected-variable"]);
  });
});
