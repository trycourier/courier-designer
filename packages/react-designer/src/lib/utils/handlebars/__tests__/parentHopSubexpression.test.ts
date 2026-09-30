import { describe, expect, it } from "vitest";
import { renderVariablesInHtmlString } from "@/components/utils/htmlBlockVariables";
import { validateHandlebars } from "../validateHandlebars";

/**
 * A `../` hop inside a SUB-EXPRESSION, from a customer's quote template:
 *
 *   {{#each items}}{{#if (condition ../li_count "<" 10)}}…{{/if}}{{/each}}
 *
 * It renders — measured on dev, requestId
 * 1-6abd5047-cb7aa0b53fc680258f21dd28, where both images appear in the output,
 * so `../li_count` resolved and the condition ran. The template was blocked
 * from publishing anyway.
 */
const EXPR = '{{#if (condition ../li_count "<" 10)}}';

describe("a parent hop inside a sub-expression", () => {
  it("is not a malformed path", () => {
    expect(
      validateHandlebars(`{{#each items}}${EXPR}x{{/if}}{{/each}}`).map((issue) => issue.code)
    ).toEqual([]);
  });

  it("is not one however deeply it is nested", () => {
    for (const text of [
      '{{#each a}}{{#if (condition ../n "<" 10)}}x{{/if}}{{/each}}',
      '{{#each a}}{{#each b}}{{#if (condition ../../n "<" 10)}}x{{/if}}{{/each}}{{/each}}',
      '{{#each a}}{{#if (and (condition ../n "<" 10) ../flag)}}x{{/if}}{{/each}}',
      "{{#each a}}{{capitalize ../name}}{{/each}}",
    ]) {
      expect(
        validateHandlebars(text).map((i) => i.code),
        text
      ).toEqual([]);
    }
  });

  it("still catches a real empty segment inside a sub-expression", () => {
    expect(
      validateHandlebars('{{#if (condition data.d..name "==" 1)}}x{{/if}}').map((i) => i.code)
    ).toContain("trailing-dot");
  });
});

/**
 * The same expression stopped the HTML block chipping anything after it: the
 * `"<"` string literal reads as the start of an HTML tag, so every following
 * expression was treated as sitting inside one and left as raw text.
 */
describe("an HTML block holding a `<` inside an expression", () => {
  const chipped = (html: string) => {
    const out = renderVariablesInHtmlString(html, {}, "show-variables");
    // Whatever is left outside chip markup is what the author sees as raw text.
    const bare = out.replace(/<span class="courier-[\s\S]*?<\/span><\/span>/g, "");
    return bare.match(/\{\{[^{}]*\}\}/g) ?? [];
  };

  it("chips every expression after it, not just the ones before", () => {
    expect(chipped(`<p>${EXPR} hello {{name}} {{/if}}</p>`)).toEqual([]);
  });

  it("does the same inside a table, where the customer's markup put it", () => {
    expect(chipped(`<table><tr><td>${EXPR}<img alt="a">{{/if}}{{name}}</td></tr></table>`)).toEqual(
      []
    );
  });

  it("does not let a `>` operator close a tag early either", () => {
    const html = '<img alt="{{#if (condition data.n ">" 5)}}many{{/if}}"><p>{{data.name}}</p>';
    // The two inside the `alt` stay raw, which is the rule `tagRanges` is for.
    // What matters is that the tag ends at its own `>`, so `{{data.name}}`
    // after it is chipped rather than swallowed.
    expect(chipped(html)).toEqual(['{{#if (condition data.n ">" 5)}}', "{{/if}}"]);
  });

  it("still leaves a real tag's attributes alone", () => {
    // `{{name}}` inside an attribute is substituted by the field render, not
    // chipped here — the rule that `tagRanges` exists for.
    const out = renderVariablesInHtmlString(
      '<img src="{{data.url}}" alt="x">',
      {},
      "show-variables"
    );
    expect(out).toBe('<img src="{{data.url}}" alt="x">');
  });
});
