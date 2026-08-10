import { describe, expect, it } from "vitest";
import {
  getEmailEditorDocumentStyleVars,
  getTierFontSizePx,
  getTierLineHeightPx,
  getTierStyleVars,
  resolveInheritedTypography,
  resolveLineHeightPx,
  tierForTextBlock,
} from "./email-editor-tiptap-styles";

describe("getTierFontSizePx / getTierLineHeightPx", () => {
  it("returns the preset for each known tier", () => {
    expect(getTierFontSizePx("text")).toBe(14);
    expect(getTierFontSizePx("h1")).toBe(32);
    expect(getTierFontSizePx("h2")).toBe(24);
    expect(getTierFontSizePx("subtext")).toBe(11);
    expect(getTierLineHeightPx("text")).toBe(18);
    expect(getTierLineHeightPx("h1")).toBe(40);
  });

  it("uses the quote variants when asked", () => {
    expect(getTierFontSizePx("text", true)).toBe(14);
    expect(getTierFontSizePx("h1", true)).toBe(32);
  });

  // `text_style` is only validated on the /send path, so Elemental reaching the
  // editor can carry anything. Indexing the preset tables with an unrecognized
  // tier used to throw and take the whole document conversion down.
  it("falls back to the body tier for an unknown tier instead of throwing", () => {
    for (const tier of ["h4", "display", "", undefined]) {
      expect(() => getTierFontSizePx(tier)).not.toThrow();
      expect(getTierFontSizePx(tier)).toBe(14);
      expect(getTierLineHeightPx(tier)).toBe(18);
    }
  });

  it("falls back to the quote tier for an unknown tier in a quote", () => {
    expect(getTierFontSizePx("h4", true)).toBe(14);
    expect(getTierLineHeightPx("h4", true)).toBe(18);
  });
});

describe("resolveLineHeightPx", () => {
  it("prefers an explicit line height", () => {
    expect(resolveLineHeightPx(20, 40)).toBe(40);
  });

  it("scales off the font size when there is none", () => {
    expect(resolveLineHeightPx(20)).toBe(26);
    expect(resolveLineHeightPx(18.72)).toBe(24);
  });

  it("returns undefined when neither is set", () => {
    expect(resolveLineHeightPx()).toBeUndefined();
  });
});

describe("getTierStyleVars", () => {
  it("emits the font size and its derived line height", () => {
    expect(getTierStyleVars("p", { fontSize: 20 })).toEqual({
      "--email-editor-p-font-size": "20px",
      "--email-editor-p-line-height": "26px",
    });
  });

  it("uses the quote prefix when asked", () => {
    expect(getTierStyleVars("h1", { fontSize: 30 }, { quote: true })).toEqual({
      "--email-editor-blockquote-h1-font-size": "30px",
      "--email-editor-blockquote-h1-line-height": "39px",
    });
  });

  it("emits nothing when neither value is set", () => {
    expect(getTierStyleVars("p", {})).toEqual({});
  });

  it("lets the block's own line height win over the derived one", () => {
    expect(getTierStyleVars("p", { fontSize: 20, lineHeight: 50 })).toMatchObject({
      "--email-editor-p-line-height": "50px",
    });
  });

  // The renderer resolves the document base into `lineHeight` BEFORE it
  // auto-scales, so a block that sets only a font size must not derive a value
  // that beats the base — the block's variable sits on a closer ancestor and
  // would win the cascade.
  it("lets the document base line height win over the block's derived one", () => {
    expect(getTierStyleVars("p", { fontSize: 20, documentLineHeight: 40 })).toEqual({
      "--email-editor-p-font-size": "20px",
      "--email-editor-p-line-height": "40px",
    });
  });

  it("still prefers the block's explicit line height over the document base", () => {
    expect(
      getTierStyleVars("p", { fontSize: 20, lineHeight: 50, documentLineHeight: 40 })
    ).toMatchObject({ "--email-editor-p-line-height": "50px" });
  });

  it("does not invent a line height from the document base alone", () => {
    // With no block font size the tier preset already applies, and the document
    // base is set on the container — nothing to emit at block level.
    expect(getTierStyleVars("p", { documentLineHeight: 40 })).toEqual({
      "--email-editor-p-line-height": "40px",
    });
  });
});

describe("getEmailEditorDocumentStyleVars", () => {
  it("reaches the body tiers and the action label, never the headings, with the base size", () => {
    const vars = getEmailEditorDocumentStyleVars({ fontSize: 20 });

    expect(vars["--email-editor-p-font-size"]).toBe("20px");
    expect(vars["--email-editor-blockquote-p-font-size"]).toBe("20px");
    expect(vars["--email-editor-action-font-size"]).toBe("20px");
    expect(vars).not.toHaveProperty("--email-editor-h1-font-size");
    expect(vars).not.toHaveProperty("--email-editor-h2-font-size");
    expect(vars).not.toHaveProperty("--email-editor-h3-font-size");
  });

  it("reaches every tier with the base line height", () => {
    const vars = getEmailEditorDocumentStyleVars({ lineHeight: 32 });

    for (const tier of ["p", "h1", "h2", "h3"]) {
      expect(vars[`--email-editor-${tier}-line-height`]).toBe("32px");
      expect(vars[`--email-editor-blockquote-${tier}-line-height`]).toBe("32px");
    }
    expect(vars).not.toHaveProperty("--email-editor-p-font-size");
  });

  it("emits nothing when neither is set", () => {
    expect(getEmailEditorDocumentStyleVars({})).toEqual({});
  });
});

describe("tierForTextBlock", () => {
  it("maps paragraphs to the body tier and headings to their level", () => {
    expect(tierForTextBlock("paragraph")).toBe("text");
    expect(tierForTextBlock("heading", 1)).toBe("h1");
    expect(tierForTextBlock("heading", 2)).toBe("h2");
    expect(tierForTextBlock("heading", 3)).toBe("h3");
  });

  it("collapses headings below h3, which Elemental has no tier for", () => {
    expect(tierForTextBlock("heading", 4)).toBe("h3");
    expect(tierForTextBlock("heading", 6)).toBe("h3");
    expect(tierForTextBlock("heading")).toBe("h3");
  });
});

// This is what the block-level and text-level inputs show while the block sets
// nothing of its own, so it has to agree with getEmailEditorDocumentStyleVars —
// otherwise the field claims a size the canvas doesn't apply.
describe("resolveInheritedTypography", () => {
  it("falls back to the tier presets with no document base", () => {
    expect(resolveInheritedTypography({ tier: "text" })).toEqual({ fontSize: 14, lineHeight: 18 });
    expect(resolveInheritedTypography({ tier: "h1" })).toEqual({ fontSize: 32, lineHeight: 40 });
    expect(resolveInheritedTypography({ tier: "quote", isQuote: true })).toEqual({
      fontSize: 14,
      lineHeight: 18,
    });
  });

  it("takes the document base on the body tier", () => {
    expect(
      resolveInheritedTypography({ tier: "text", documentFontSize: 13, documentLineHeight: 15 })
    ).toEqual({ fontSize: 13, lineHeight: 15 });
  });

  it("auto-scales the line height off a base font size with no base line height", () => {
    // Mirrors the renderer: 13 * 1.3, rounded.
    expect(resolveInheritedTypography({ tier: "text", documentFontSize: 13 })).toEqual({
      fontSize: 13,
      lineHeight: 17,
    });
  });

  it("keeps the heading preset size but takes an explicit base line height", () => {
    expect(
      resolveInheritedTypography({ tier: "h1", documentFontSize: 13, documentLineHeight: 15 })
    ).toEqual({ fontSize: 32, lineHeight: 15 });
  });

  it("never lets a base font size derive a line height for a heading", () => {
    expect(resolveInheritedTypography({ tier: "h2", documentFontSize: 13 })).toEqual({
      fontSize: 24,
      lineHeight: 32,
    });
  });

  it("resolves quote tiers off the quote presets", () => {
    expect(resolveInheritedTypography({ tier: "h1", isQuote: true })).toEqual({
      fontSize: 32,
      lineHeight: 40,
    });
    expect(
      resolveInheritedTypography({ tier: "text", isQuote: true, documentFontSize: 13 })
    ).toEqual({ fontSize: 13, lineHeight: 17 });
  });
});
