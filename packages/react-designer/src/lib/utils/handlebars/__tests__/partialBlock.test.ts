import { describe, expect, it } from "vitest";
import { classifyExpression } from "../classifyExpression";
import { collectTemplateIssues } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

/**
 * `{{#> name}}…{{/name}}` renders a partial with a block — brand snippets are
 * used this way, and they resolve at send time, so the name is never checked.
 */
describe("a partial block", () => {
  it("classifies as a block named for its closer", () => {
    expect(classifyExpression("#> width_setter ")).toMatchObject({
      kind: "blockOpen",
      name: "width_setter",
      partialBlock: true,
    });
    expect(classifyExpression("#>body_text title=data.x")).toMatchObject({
      name: "body_text",
      hash: ["title=data.x"],
    });
  });

  it("does not block Publish", () => {
    expect(validateHandlebars("{{#> width_setter }}x{{/width_setter}}")).toEqual([]);
    expect(validateHandlebars("{{~#> layout~}}x{{~/layout~}}")).toEqual([]);
  });

  it("still flags a close that matches nothing", () => {
    const codes = validateHandlebars("{{#> layout}}x{{/each}}").map((issue) => issue.code);
    expect(codes).toContain("mismatched-close");
  });

  it("still flags an unclosed one", () => {
    const codes = validateHandlebars("{{#> layout}}x").map((issue) => issue.code);
    expect(codes).toContain("unclosed-block");
  });

  // The shape of a v1 template that wraps its body in brand snippets.
  it("leaves a snippet-wrapped template publishable", () => {
    const html = [
      "{{#> width_setter }}",
      "{{> subject_setter defaultSubject=data.deal.headline}}",
      "{{>dealBaseVariables}}",
      "{{#> body_text }}{{#if data.locked}}{{data.name}}{{else}}{{{data.message}}}{{/if}}{{/body_text}}",
      "{{>display_financials_table data.deal.financials_table}}",
      "{{/width_setter}}",
    ].join("\n");
    const issues = collectTemplateIssues({
      version: "2022-01-01",
      elements: [
        { type: "channel", channel: "email", elements: [{ type: "html", content: html }] },
      ],
    } as never);
    expect(issues.filter((issue) => issue.severity === "blocking")).toEqual([]);
  });
});
