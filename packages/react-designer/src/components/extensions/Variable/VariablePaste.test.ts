import { describe, expect, it } from "vitest";
import { replaceVariablePatternsInHtml } from "./VariablePaste";

/**
 * Pasting has to parse handlebars the way loading a saved template does.
 *
 * It used to key on `isValidVariableName`, so `{{else}}` — a valid identifier —
 * became a variable chip, while `{{#if …}}` and `{{/if}}` failed the check and
 * stayed as plain text. An author pasting a conditional got one red chip and
 * two runs of literal braces.
 */
const FLOAT_PASTE =
  "[{{tenant.name}}] {{#if data.has_all_payment_connections}}A bank connection was " +
  "successful on Float! {{else}} Float accounts can now be funded!{{/if}}";

describe("replaceVariablePatternsInHtml", () => {
  it("makes a variable a variable span", () => {
    expect(replaceVariablePatternsInHtml("Hi {{data.name}}")).toBe(
      'Hi <span data-variable="true" data-id="data.name"></span>'
    );
  });

  it("makes a block opener, else and closer expression spans", () => {
    const html = replaceVariablePatternsInHtml(FLOAT_PASTE);

    expect(html).toContain('data-variable="true" data-id="tenant.name"');
    for (const raw of ["{{#if data.has_all_payment_connections}}", "{{else}}", "{{/if}}"]) {
      expect(html, raw).toContain(`data-handlebars="true" data-raw="${raw}"`);
    }
    // `{{else}}` must not come back as a variable — that was the visible bug.
    expect(html).not.toContain('data-id="else"');
  });

  it("carries the kind and name the loader would derive", () => {
    const html = replaceVariablePatternsInHtml("{{#if data.x}}a{{/if}}");
    expect(html).toContain('data-kind="blockOpen"');
    expect(html).toContain('data-kind="blockClose"');
    expect(html).toContain('data-name="if"');
  });

  it("makes a helper call an expression, not a variable", () => {
    const html = replaceVariablePatternsInHtml("{{capitalize data.name}}");
    expect(html).toContain('data-handlebars="true"');
    expect(html).not.toContain("data-variable");
  });

  it("escapes quotes so the expression survives the attribute", () => {
    const raw = '{{#if (condition data.x "==" "y")}}';
    const html = replaceVariablePatternsInHtml(raw);
    // Parse it back the way the schema will: the round trip is the guarantee,
    // not the escaping itself.
    const el = new DOMParser().parseFromString(html, "text/html").querySelector("[data-raw]");
    expect(el?.getAttribute("data-raw")).toBe(raw);
  });

  it("leaves text with no handlebars alone", () => {
    expect(replaceVariablePatternsInHtml("just words")).toBe("just words");
  });

  it("keeps a malformed reference as written rather than inventing a chip", () => {
    expect(replaceVariablePatternsInHtml("{{user. firstName}}")).toContain("{{user. firstName}}");
  });

  describe("pasting our own chips back", () => {
    // What the editor itself puts on the clipboard: HandlebarsExpression's
    // renderHTML, already a chip span with the source in an attribute.
    const clipboardHtml =
      '<p><span data-variable="true" data-id="tenant.name">{{tenant.name}}</span> ' +
      '<span data-handlebars="true" data-raw="{{#if data.vip}}" data-kind="blockOpen" ' +
      'data-name="if">{{#if data.vip}}</span>(VIP)' +
      '<span data-handlebars="true" data-raw="{{/if}}" data-kind="blockClose" ' +
      'data-name="if">{{/if}}</span></p>';

    it("leaves an existing chip span untouched", () => {
      const out = replaceVariablePatternsInHtml(clipboardHtml);
      // Re-segmenting the markup produced a chip reading `<span data-handlebars=`
      // followed by the attribute text as literal content.
      expect(out).not.toContain("&lt;span");
      expect(out).not.toContain('data-raw="<span');

      const doc = new DOMParser().parseFromString(out, "text/html");
      expect(doc.querySelectorAll("[data-handlebars]")).toHaveLength(2);
      expect(doc.querySelectorAll("[data-variable]")).toHaveLength(1);
    });

    it("does not re-escape an operator inside data-raw", () => {
      const html =
        '<span data-handlebars="true" data-raw="{{#if (condition data.count &quot;&gt;&quot; 2)}}"' +
        ' data-kind="blockOpen" data-name="if">x</span>';
      const out = replaceVariablePatternsInHtml(html);
      const el = new DOMParser().parseFromString(out, "text/html").querySelector("[data-raw]");
      // `">"` must survive as an operator, not become `"&gt;"` in the source.
      expect(el?.getAttribute("data-raw")).toBe('{{#if (condition data.count ">" 2)}}');
    });

    it("still segments a text node beside an existing chip", () => {
      const html =
        '<p><span data-handlebars="true" data-raw="{{/if}}" data-kind="blockClose" ' +
        'data-name="if">{{/if}}</span> then {{data.name}}</p>';
      const doc = new DOMParser().parseFromString(replaceVariablePatternsInHtml(html), "text/html");
      expect(doc.querySelectorAll("[data-handlebars]")).toHaveLength(1);
      expect(doc.querySelector("[data-variable]")?.getAttribute("data-id")).toBe("data.name");
    });
  });
});
