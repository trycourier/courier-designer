import { describe, expect, it } from "vitest";
import { renderVariablesInTextString } from "./htmlBlockVariables";

/**
 * Header fields — CC, BCC, From, Reply-To — are plain text, not HTML. The
 * caller escaped the whole field first, `{{…}}` included, and the chip builder
 * escaped the label again, so a read-only CC chip read
 * `#if data.name &quot;==&quot; &quot;Geraldo&quot;` where the editor showed
 * plain quotes. Escaping the text and building the chip from the expression as
 * written keeps each part escaped exactly once.
 */
describe("renderVariablesInTextString", () => {
  const render = (text: string, values: Record<string, string> = {}) =>
    renderVariablesInTextString(text, values);

  it("escapes a quoted expression exactly once", () => {
    // The markup carries `&quot;`, which renders as `"`. What went wrong was
    // the second pass: the caller escaped the field first, so the chip label
    // held `&amp;quot;` and read `&quot;` on screen.
    const out = render('{{truncate data.body 10 "..."}}');
    expect(out).toContain("&quot;");
    expect(out).not.toContain("&amp;quot;");
  });

  it("judges the expression by what was written, not by entities", () => {
    // Escaped source reads as a broken expression; this one is valid and must
    // not be drawn red.
    expect(render('{{truncate data.body 10 "..."}}')).not.toContain("-invalid");
  });

  it("still marks a genuinely broken expression invalid", () => {
    // A field compiles on its own, so an opener with no closer fails the send.
    expect(render('{{#if data.name "==" "Geraldo"}}')).toContain("-invalid");
  });

  it("keeps a whole conditional in one field clean", () => {
    const out = render('{{#if (condition data.name "==" "Geraldo")}}yes{{/if}}');
    expect(out).not.toContain("-invalid");
    expect(out).toContain("&quot;");
  });

  it("escapes the text around a chip exactly once", () => {
    const out = render("a < b & {{data.x}}", { "data.x": "Ada" });
    expect(out).toContain("a &lt; b &amp; ");
    expect(out).not.toContain("&amp;lt;");
    expect(out).not.toContain("&amp;amp;");
  });

  it("escapes markup in the text, because this is text and not HTML", () => {
    expect(render("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("substitutes values in preview, escaped once", () => {
    const out = renderVariablesInTextString("Hi {{data.x}}", { "data.x": "A & B" }, "wysiwyg");
    expect(out).toBe("Hi A &amp; B");
  });

  it("returns empty input untouched", () => {
    expect(render("")).toBe("");
  });
});
