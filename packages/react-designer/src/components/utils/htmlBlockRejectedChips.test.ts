import { describe, expect, it } from "vitest";
import type { ElementalContent } from "@/types";
import { collectTemplateIssues } from "@/lib/utils/handlebars/templateIssues";
import { renderVariablesInHtmlString } from "./htmlBlockVariables";

/**
 * A name the HOST's validator turns down is drawn amber on a text block's chip,
 * because that chip is a React component reading `variableValidationAtom`. An
 * HTML block is string markup built here, so it never saw that rule: the gutter
 * counted a warning the canvas refused to show, and the author had no way to
 * find which expression it meant.
 *
 * The judgement comes from `rejectedVariablesIn`, the same function
 * `collectTemplateIssues` uses, so a chip and the count cannot drift.
 */
// Studio's rule: a bare `data` is not one of the accepted prefixes.
const validate = (name: string) => /^(data|profile|tenant)\./.test(name) || name === "$.item";
const options = { variableValidation: { validate } };

const htmlElement = (html: string) =>
  ({
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", elements: [{ type: "html", content: html }] }],
  }) as unknown as ElementalContent;

describe("an HTML block chip for a name the host rejects", () => {
  it("is amber, and the issue list counts exactly one", () => {
    const html = "<p>{{#with data}}x{{/with}}</p>";

    const out = renderVariablesInHtmlString(html, {}, "show-variables", options);
    expect(out).toContain("courier-handlebars-chip-warning");

    const issues = collectTemplateIssues(htmlElement(html), options);
    expect(issues.map((issue) => issue.code)).toEqual(["rejected-variable"]);
  });

  it("marks a plain value chip too", () => {
    const out = renderVariablesInHtmlString("<p>{{name}}</p>", {}, "show-variables", options);
    expect(out).toContain("courier-variable-chip-warning");
  });

  it("marks a path inside a helper argument", () => {
    const out = renderVariablesInHtmlString(
      '<p>{{var "items.length"}}</p>',
      {},
      "show-variables",
      options
    );
    expect(out).toContain("courier-handlebars-chip-warning");
  });

  it("leaves an accepted name alone", () => {
    const out = renderVariablesInHtmlString("<p>{{data.name}}</p>", {}, "show-variables", options);
    expect(out).not.toContain("courier-variable-chip-warning");
  });

  it("says nothing when the host supplies no validator, as before", () => {
    const out = renderVariablesInHtmlString(
      "<p>{{#with data}}x{{/with}}</p>",
      {},
      "show-variables"
    );
    expect(out).not.toContain("courier-handlebars-chip-warning");
  });

  it("never overrides a blocking chip with a warning", () => {
    // `{{/if}}` with no opener is a send failure; the host's opinion of a name
    // cannot soften that.
    const out = renderVariablesInHtmlString("<p>{{/if}}</p>", {}, "show-variables", options);
    expect(out).toContain("courier-handlebars-chip-invalid");
    expect(out).not.toContain("courier-handlebars-chip-warning");
  });
});
