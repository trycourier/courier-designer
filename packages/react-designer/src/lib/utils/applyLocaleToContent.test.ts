import { describe, expect, it } from "vitest";
import type { ElementalContent } from "@/types/elemental.types";
import { applyLocaleToContent } from "./applyLocaleToContent";

const channel = (extra: Record<string, unknown>): ElementalContent => {
  const content: unknown = {
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", elements: [], ...extra }],
  };
  return content as ElementalContent;
};

const emailOf = (content: unknown) =>
  (content as { elements: Record<string, unknown>[] }).elements[0];

// F-009: the send swaps a localized `raw` in whole (backend
// interpolate-locales.ts), so a translation without `transformers` sends its
// braces verbatim. Merging kept the base transformers and hid that.
describe("applyLocaleToContent — raw", () => {
  it("replaces raw wholesale, as the send does", () => {
    const localized = applyLocaleToContent(
      channel({
        raw: { html: "<p>Hello {{data.name}}</p>", transformers: ["handlebars"] },
        locales: { fr: { raw: { html: "<p>Bonjour {{data.name}}</p>" } } },
      }),
      "fr"
    );
    expect(emailOf(localized).raw).toEqual({ html: "<p>Bonjour {{data.name}}</p>" });
  });

  it("only swaps raw in where the node already has one", () => {
    const localized = applyLocaleToContent(
      channel({ locales: { fr: { raw: { html: "<p>Bonjour</p>" } } } }),
      "fr"
    );
    expect(emailOf(localized).raw).toBeUndefined();
  });
});
