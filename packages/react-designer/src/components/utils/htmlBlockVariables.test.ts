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

  it("reads the paths a helper operates on, and ignores loop refs and triple braces", () => {
    // `{{#if data.vip}}` refers to `data.vip` as plainly as `{{data.vip}}` does,
    // so it has to contribute the field. `this.name` and `$.item.sku` are
    // supplied by the enclosing block, and a triple-stache is unreproducible.
    expect(
      extractVariablesFromHtmlString(
        "{{#if data.vip}}{{/if}}{{#each data.items}}{{this.name}}{{$.item.sku}}{{/each}}{{{data.raw}}}"
      )
    ).toEqual(["data.vip", "data.items"]);
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

    // The chip is one colour now; a known value shows in the label, not as a
    // separate colour variant.
    expect(result).toContain("courier-variable-chip");
    expect(result).toContain("data.name=&quot;Ada&quot;");
    expect(result).not.toContain("{{data.name}}");
  });

  it("renders a valueless chip when no value is known", () => {
    const result = renderVariablesInHtmlString("<p>{{data.name}}</p>", {}, "show-variables");

    expect(result).toContain("courier-variable-chip");
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

  it("chips control flow, and judges a loop-local by its block context", () => {
    // `segmentText` decides: `{{this.name}}` is valid inside a block and gets a
    // chip, exactly as the design view renders it. A second rule here is how the
    // two surfaces drift apart.
    const inside = renderVariablesInHtmlString(
      "{{#each data.items}}<p>{{this.name}}</p>{{/each}}{{{data.raw}}}"
    );
    expect(inside).toContain('data-handlebars-kind="blockOpen"');
    expect(inside).toContain('data-handlebars-kind="blockClose"');
    expect(inside).toContain("courier-variable-chip");
    expect(inside).not.toContain("{{this.name}}");
    expect(inside).toContain("{{{data.raw}}}");
  });

  it("leaves a loop-local literal at top level, where it resolves against nothing", () => {
    const out = renderVariablesInHtmlString("<p>{{this.name}}</p>");
    expect(out).toBe("<p>{{this.name}}</p>");
  });

  it("returns the input unchanged when there is nothing to resolve", () => {
    expect(renderVariablesInHtmlString("", {}, "show-variables")).toBe("");
    expect(renderVariablesInHtmlString("<p>plain</p>", {}, "wysiwyg")).toBe("<p>plain</p>");
  });

  describe("splicing into raw HTML", () => {
    it("never substitutes inside a tag, which would destroy the attribute", () => {
      // The one way this function can corrupt a customer's markup. `{{...}}` in
      // an attribute is ordinary in hand-written HTML.
      const html = '<a href="{{data.url}}">Hi {{data.name}}</a>';
      const out = renderVariablesInHtmlString(html, { "data.name": "Ada" });
      expect(out).toContain('href="{{data.url}}"');
      expect(out).toContain("courier-variable-chip");
    });

    it("leaves an unclosed tag's remainder alone rather than splicing into it", () => {
      const html = '<a href="{{data.url}}';
      expect(renderVariablesInHtmlString(html)).toBe(html);
    });

    it("chips an occurrence between tags on either side of one", () => {
      const out = renderVariablesInHtmlString("<b>{{data.a}}</b><i>{{data.b}}</i>");
      expect(out.match(/courier-variable-chip/g)).toHaveLength(2);
      expect(out).toContain("<b>");
      expect(out).toContain("</i>");
    });

    it("is not confused by a > inside a quoted attribute", () => {
      const html = '<a title="a > b" href="x">{{data.a}}</a>';
      const out = renderVariablesInHtmlString(html);
      expect(out).toContain('title="a > b"');
      expect(out).toContain("courier-variable-chip");
    });
  });

  describe("control-flow chips", () => {
    it("labels each kind the way the design view does", () => {
      const out = renderVariablesInHtmlString(
        "{{#if data.x}}a{{else}}b{{/if}}{{capitalize data.n}}{{!-- note --}}"
      );
      for (const kind of ["blockOpen", "blockElse", "blockClose", "helperCall", "comment"]) {
        expect(out, kind).toContain(`data-handlebars-kind="${kind}"`);
      }
      // A comment shows the word rather than its body, as the chip does.
      expect(out).toContain(">comment<");
    });

    it("keeps the whole label, which the stylesheet wraps and clamps", () => {
      // Cutting here would throw away text the chip has room to show, and no
      // CSS could bring it back.
      const long = `{{capitalize ${"data.very_long_path".repeat(4)}}}`;
      const out = renderVariablesInHtmlString(long);
      expect(out).not.toContain("…");
      expect(out).toContain("data.very_long_pathdata.very_long_path");
      expect(out).toContain("title=");
    });

    it("carries no inline colour, so the stylesheet stays the source of truth", () => {
      const out = renderVariablesInHtmlString("{{#if data.x}}a{{/if}}");
      expect(out).not.toContain('style="color');
      expect(out).toContain("courier-handlebars-chip");
    });

    it("renders nothing for an expression in wysiwyg, where the field render owns it", () => {
      const out = renderVariablesInHtmlString("{{#if data.x}}kept{{/if}}", {}, "wysiwyg");
      expect(out).toBe("kept");
    });
  });
});

/**
 * A `<script>` or `<style>` body is raw text, not markup: splicing chip markup
 * into it produced `var x = "<span class="courier-variable-chip"…`, which is a
 * SyntaxError in the preview iframe. A comment is not markup either, and only
 * survived by accident — the tag guard read `<!-- a > b -->` as ending at the
 * first `>`.
 */
describe("raw-text element contents are left alone", () => {
  const render = (html: string) => renderVariablesInHtmlString(html, { "data.x": "Ada" });

  it("leaves a script body exactly as written", () => {
    const html = '<script>var x = "{{data.x}}";</script>';
    expect(render(html)).toBe(html);
  });

  it("leaves a style body exactly as written", () => {
    const html = '<style>.x{content:"{{data.x}}"}</style>';
    expect(render(html)).toBe(html);
  });

  it("leaves a comment alone, including one holding a bare >", () => {
    const html = "<!-- a > {{data.x}} -->";
    expect(render(html)).toBe(html);
  });

  it("leaves title and textarea alone, where markup shows as text", () => {
    for (const html of ["<title>{{data.x}}</title>", "<textarea>{{data.x}}</textarea>"]) {
      expect(render(html), html).toBe(html);
    }
  });

  it("still substitutes after the raw-text element closes", () => {
    const out = render('<script>var a = "{{data.x}}";</script><p>{{data.x}}</p>');
    expect(out).toContain('var a = "{{data.x}}"');
    expect(out).toContain("courier-variable-chip");
  });

  it("treats an unclosed script as raw text to the end", () => {
    const html = '<script>var x = "{{data.x}}";';
    expect(render(html)).toBe(html);
  });

  it("is case-insensitive about the tag", () => {
    const html = '<SCRIPT>var x = "{{data.x}}";</SCRIPT>';
    expect(render(html)).toBe(html);
  });
});
