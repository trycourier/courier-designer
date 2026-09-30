import { describe, expect, it } from "vitest";
import { renderElementalPreview } from "../renderElementalPreview";
import { renderTitlePreview, resetPreviewEnv } from "../renderPreview";

const DATA = { data: { s: { name: "ada" } } };

/**
 * `handlebars/template/text.ts` drops a single-value field — subject, from,
 * reply-to — for its default when the rendered text still carries an unresolved
 * `{…}`, rather than delivering the placeholder. Measured in the 2026-09-29
 * audit (I-29): a title of `P1 {{data.s.name}} {nope}` sends as "(no subject)",
 * with no push or inbox title either, while the preview showed `P1 ada {nope}`.
 */
describe("a title with something left unresolved", () => {
  it("previews as nothing, which is what the reader gets", () => {
    resetPreviewEnv();
    expect(renderTitlePreview("P1 {{data.s.name}} {nope}", DATA).text).toBe("");
  });

  it("does the same through an elemental meta title", () => {
    resetPreviewEnv();
    const rendered = renderElementalPreview(
      { version: "2022-01-01", elements: [{ type: "meta", title: "P1 {{data.s.name}} {nope}" }] },
      DATA
    );
    expect((rendered.content.elements[0] as { title: string }).title).toBe("");
  });

  it("keeps a title whose variables all resolve", () => {
    resetPreviewEnv();
    expect(renderTitlePreview("P1 {{data.s.name}} {data.s.name}", DATA).text).toBe("P1 ada ada");
    expect(renderTitlePreview("P1 {{data.s.name}}", DATA).text).toBe("P1 ada");
    expect(renderTitlePreview("Plain title", DATA).text).toBe("Plain title");
  });

  it("leaves a body block alone, which the send delivers with the placeholder", () => {
    resetPreviewEnv();
    const rendered = renderElementalPreview(
      { version: "2022-01-01", elements: [{ type: "text", content: "B {{data.s.name}} {nope}" }] },
      DATA
    );
    expect((rendered.content.elements[0] as { content: string }).content).toBe("B ada {nope}");
  });
});
