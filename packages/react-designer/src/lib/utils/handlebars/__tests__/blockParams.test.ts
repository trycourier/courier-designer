import { describe, expect, it } from "vitest";
import { classifyExpression } from "../classifyExpression";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";
import { segmentText } from "../segmentText";
import { validateHandlebars } from "../validateHandlebars";
import { variableReferencesIn } from "../variableReferences";

/**
 * `{{#each items as |item i|}}` passes `each` ONE argument and binds two names.
 * Measured on dev (req 1-6aba9c47-aa995932237e9af4771751ea):
 * `{{#each data.d.items as |item i|}}[{{i}}:{{item.name}}]{{/each}}` renders
 * `[0:x][1:y]`.
 */
describe("a block-parameters clause", () => {
  it("is not read as arguments", () => {
    const expr = classifyExpression("#each data.d.items as |item i|");
    expect(expr.args).toEqual(["data.d.items"]);
    expect(expr.blockParams).toEqual(["item", "i"]);
  });

  it("does not block Publish", () => {
    expect(
      validateHandlebars("{{#each data.d.items as |item i|}}[{{i}}:{{item.name}}]{{/each}}")
    ).toEqual([]);
    expect(validateHandlebars("{{#with data.d.o as |o|}}{{o.a}}{{/with}}")).toEqual([]);
  });

  it("leaves no chip marked", () => {
    const marked = segmentText(
      "{{#each data.d.items as |item i|}}[{{i}}:{{item.name}}]{{/each}}"
    ).filter((segment) => segment.type !== "text" && segment.isInvalid);
    expect(marked).toEqual([]);
  });

  it("does not offer the bound names as variables to fill in", () => {
    const names = variableReferencesIn(
      "{{#each data.d.items as |item i|}}{{i}}{{item.name}}{{/each}}"
    );
    expect(names).toContain("data.d.items");
    expect(names).not.toContain("item");
    expect(names).not.toContain("i");
  });

  it("renders the way the send does", () => {
    resetPreviewEnv();
    const data = { data: { d: { items: [{ name: "x" }, { name: "y" }] } } };
    expect(
      renderHandlebarsPreview(
        "{{#each data.d.items as |item i|}}[{{i}}:{{item.name}}]{{/each}}",
        data
      ).text
    ).toBe("[0:x][1:y]");
  });

  it("leaves a real argument called as alone", () => {
    const expr = classifyExpression('#if (condition data.a "==" "as")');
    expect(expr.blockParams).toBeUndefined();
    expect(classifyExpression("#each data.as").args).toEqual(["data.as"]);
    // An `as` with nothing that looks like a `|…|` clause after it stays an
    // argument, wrong though the template is.
    expect(classifyExpression("#each data.items as").args).toEqual(["data.items", "as"]);
  });
});
