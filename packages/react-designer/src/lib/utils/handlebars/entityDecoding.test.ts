import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "../convertElementalToTiptap/convertElementalToTiptap";

/**
 * Rows measured against real sends on dev (audit run 20260923-145708), not
 * against this renderer. Elemental text content is entity-decoded once by the
 * send and then escaped for output, so the canvas has to decode once too or it
 * shows entity source where the reader will see characters.
 */
function elemental(content: string) {
  const doc: unknown = {
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", elements: [{ type: "text", content }] }],
  };
  return doc as never;
}

function previewOptions(previewData: Record<string, unknown>) {
  const options: unknown = { channel: "email", previewData };
  return options as never;
}

const textOf = (doc: unknown) =>
  (JSON.stringify(doc).match(/"text":"((?:[^"\\]|\\.)*)"/g) ?? [])
    .map((m) => JSON.parse(m.replace(/^"text":/, "")))
    .join("");

describe("entity decoding, measured against the send", () => {
  it("decodes author-typed entities, as the send delivers them", () => {
    // send: L[&lt;b&gt; &amp; &quot;] delivers L[<b> & "]
    const doc = convertElementalToTiptap(elemental("L[&lt;b&gt; &amp; &quot;]"), {
      channel: "email",
    });
    expect(textOf(doc)).toBe('L[<b> & "]');
  });

  it("decodes helper output once, never twice", () => {
    // send: F[{{formatHTMLMessage "<b>{v}</b>" v=data.html}}] delivers
    // F[<b><i>x</i> & "q"</b>] — the whole thing as literal text.
    const doc = convertElementalToTiptap(
      elemental('F[{{formatHTMLMessage "<b>{v}</b>" v=data.html}}]'),
      previewOptions({ data: { html: '<i>x</i> & "q"' } })
    );
    expect(textOf(doc)).toBe('F[<b><i>x</i> & "q"</b>]');
  });

  it("treats double and triple stache alike, since the send does", () => {
    const opts = previewOptions({ data: { html: "<i>x</i>" } });
    const dbl = textOf(convertElementalToTiptap(elemental("D[{{data.html}}]"), opts));
    const tri = textOf(convertElementalToTiptap(elemental("T[{{{data.html}}}]"), opts));
    expect(dbl).toBe("D[<i>x</i>]");
    expect(tri).toBe("T[<i>x</i>]");
  });

  it("decodes once only, so an escaped entity survives", () => {
    // `&amp;lt;` means the characters `&lt;`, and must not become `<`.
    const doc = convertElementalToTiptap(elemental("A[&amp;lt;]"), { channel: "email" });
    expect(textOf(doc)).toBe("A[&lt;]");
  });
});
