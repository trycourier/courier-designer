import { describe, expect, it } from "vitest";
import { extractVariablesFromHtmlString, renderVariablesInHtmlString } from "./htmlBlockVariables";

describe("extractVariablesFromHtmlString", () => {
  it("returns variables written in the markup", () => {
    expect(
      extractVariablesFromHtmlString('<p>Hi {{data.name}}</p><img src="{{data.logo}}" />')
    ).toEqual(["data.name", "data.logo"]);
  });

  it("de-duplicates repeated variables", () => {
    expect(extractVariablesFromHtmlString("<p>{{data.name}}</p><p>{{ data.name }}</p>")).toEqual([
      "data.name",
    ]);
  });

  it("ignores handlebars helpers, loop refs and triple braces", () => {
    expect(
      extractVariablesFromHtmlString(
        "{{#if data.vip}}{{/if}}{{#each data.items}}{{this.name}}{{$.item.sku}}{{/each}}{{{data.raw}}}"
      )
    ).toEqual([]);
  });

  it("ignores malformed names", () => {
    expect(extractVariablesFromHtmlString("{{ not a variable }}{{data.}}{{}}")).toEqual([]);
  });

  it("returns an empty list for empty input", () => {
    expect(extractVariablesFromHtmlString()).toEqual([]);
    expect(extractVariablesFromHtmlString("")).toEqual([]);
  });
});

describe("renderVariablesInHtmlString", () => {
  it("renders a chip carrying the value in show-variables mode", () => {
    const result = renderVariablesInHtmlString(
      "<p>Hi {{data.name}}</p>",
      { "data.name": "Ada" },
      "show-variables"
    );

    expect(result).toContain("courier-variable-chip-has-value");
    expect(result).toContain("data.name=&quot;Ada&quot;");
    expect(result).not.toContain("{{data.name}}");
  });

  it("renders a valueless chip when no value is known", () => {
    const result = renderVariablesInHtmlString("<p>{{data.name}}</p>", {}, "show-variables");

    expect(result).toContain("courier-variable-chip");
    expect(result).not.toContain("courier-variable-chip-has-value");
    expect(result).toContain("data.name");
  });

  it("substitutes plain values in wysiwyg mode", () => {
    expect(
      renderVariablesInHtmlString("<p>Hi {{data.name}}</p>", { "data.name": "Ada" }, "wysiwyg")
    ).toBe("<p>Hi Ada</p>");
  });

  it("drops unknown variables in wysiwyg mode", () => {
    expect(renderVariablesInHtmlString("<p>Hi {{data.name}}</p>", {}, "wysiwyg")).toBe(
      "<p>Hi </p>"
    );
  });

  it("escapes values so they cannot inject markup", () => {
    const result = renderVariablesInHtmlString(
      "<p>{{data.name}}</p>",
      { "data.name": "<img src=x onerror=alert(1)>" },
      "wysiwyg"
    );

    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("leaves handlebars helpers and loop refs untouched", () => {
    const html =
      "{{#if data.vip}}<p>{{this.name}}</p>{{/if}}{{#each data.items}}{{/each}}{{{data.raw}}}";

    expect(renderVariablesInHtmlString(html, {}, "show-variables")).toBe(html);
  });

  it("returns the input unchanged when there is nothing to resolve", () => {
    expect(renderVariablesInHtmlString("", {}, "show-variables")).toBe("");
    expect(renderVariablesInHtmlString("<p>plain</p>", {}, "wysiwyg")).toBe("<p>plain</p>");
  });
});
