import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview, renderTitlePreview, resetPreviewEnv } from "../renderPreview";

/**
 * `handlebars/template/text.ts` drops a single-value field — a subject, a from,
 * a reply-to — for its default when the rendered text still holds an unresolved
 * `{…}`. Measured on dev: a subject of `[{{var "tenant.name"}}] Pay Co` sent
 * without a tenant arrives as `(no subject)`, because `var` leaves the literal
 * `{tenant.name}`.
 *
 * The preview showed that as a blank, which is right and unexplained. It now
 * also says WHICH placeholder did it, so a host can tell the author.
 */
describe("a title the send will drop", () => {
  it("names the placeholder that dropped it", () => {
    resetPreviewEnv();
    const result = renderTitlePreview('[{{var "tenant.name"}}] Pay Co', {});

    expect(result.text).toBe("");
    expect(result.dropped).toEqual(["tenant.name"]);
  });

  it("names every one of them, once each", () => {
    resetPreviewEnv();
    const result = renderTitlePreview(
      '{{var "tenant.name"}} {{var "tenant.nope"}} {{var "tenant.name"}}',
      {}
    );

    expect(result.dropped).toEqual(["tenant.name", "tenant.nope"]);
  });

  it("leaves the field off when the title survives", () => {
    resetPreviewEnv();
    const result = renderTitlePreview("Hi {{data.name}}", { data: { name: "Ada" } });

    expect(result.text).toBe("Hi Ada");
    expect(result.dropped).toBeUndefined();
  });

  it("leaves it off for an ordinary body render, which is not dropped", () => {
    resetPreviewEnv();
    // A body keeps the placeholder; only single-value fields are dropped.
    expect(renderHandlebarsPreview('{{var "tenant.name"}}', {}).dropped).toBeUndefined();
  });
});
