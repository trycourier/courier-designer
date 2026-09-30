import { describe, expect, it } from "vitest";
import { classifyExpression } from "../classifyExpression";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { validateHandlebars } from "../validateHandlebars";

/** `{{#*inline "p"}}…{{/inline}}` defines a partial the field can then call. */
describe("an inline partial", () => {
  it("classifies as a decorator block named for its closer", () => {
    const expr = classifyExpression('#*inline "p"');
    expect(expr).toMatchObject({ kind: "blockOpen", name: "inline", decorator: true });
    expect(expr.args).toEqual(['"p"']);
  });

  it("does not block Publish", () => {
    expect(validateHandlebars('{{#*inline "p"}}INL{{/inline}}{{> p}}')).toEqual([]);
  });

  it("still flags a close that matches nothing", () => {
    const codes = validateHandlebars('{{#*inline "p"}}INL{{/each}}').map((issue) => issue.code);
    expect(codes).toContain("mismatched-close");
  });

  it("renders the partial it defines", () => {
    resetPreviewEnv();
    const result = renderHandlebarsPreview('[{{#*inline "p"}}INL{{/inline}}{{> p}}]', {});
    expect(result.ok).toBe(true);
    expect(result.text).toBe("[INL]");
  });
});
