import { describe, it, expect } from "vitest";
import {
  isBrandColorRef,
  parseBrandColorRef,
  makeBrandColorRef,
  getBrandColorLabel,
  brandColorRefToCSSVar,
  brandColorsToCSSVars,
  resolveBrandColor,
  type BrandColor,
} from "./brandColors";

describe("isBrandColorRef", () => {
  it("should return true for valid brand color refs", () => {
    expect(isBrandColorRef("{brand.colors.primary}")).toBe(true);
    expect(isBrandColorRef("{brand.colors.secondary}")).toBe(true);
    expect(isBrandColorRef("{brand.colors.tertiary}")).toBe(true);
  });

  it("should return true for valid brand.email refs", () => {
    expect(isBrandColorRef("{brand.email.backgroundColor}")).toBe(true);
    expect(isBrandColorRef("{brand.email.blocksBackgroundColor}")).toBe(true);
    expect(isBrandColorRef("{brand.email.footerBackgroundColor}")).toBe(true);
  });

  it("should return false for hex colors", () => {
    expect(isBrandColorRef("#ff0000")).toBe(false);
    expect(isBrandColorRef("#fff")).toBe(false);
  });

  it("should return false for partial or malformed refs", () => {
    expect(isBrandColorRef("{brand.colors.quaternary}")).toBe(false);
    expect(isBrandColorRef("brand.colors.primary")).toBe(false);
    expect(isBrandColorRef("{brand.colors.primary")).toBe(false);
    expect(isBrandColorRef("brand.colors.primary}")).toBe(false);
    expect(isBrandColorRef("{brand.primary}")).toBe(false);
    expect(isBrandColorRef("{colors.primary}")).toBe(false);
    expect(isBrandColorRef("")).toBe(false);
    expect(isBrandColorRef("transparent")).toBe(false);
  });

  it("should return false for unrecognized brand.email suffixes", () => {
    expect(isBrandColorRef("{brand.email.headerColor}")).toBe(false);
    expect(isBrandColorRef("{brand.email.}")).toBe(false);
    expect(isBrandColorRef("{brand.email}")).toBe(false);
    expect(isBrandColorRef("{brand.email.BackgroundColor}")).toBe(false);
  });

  it("should return false for refs with extra whitespace", () => {
    expect(isBrandColorRef(" {brand.colors.primary}")).toBe(false);
    expect(isBrandColorRef("{brand.colors.primary} ")).toBe(false);
    expect(isBrandColorRef("{ brand.colors.primary }")).toBe(false);
    expect(isBrandColorRef(" {brand.email.backgroundColor}")).toBe(false);
  });
});

describe("parseBrandColorRef", () => {
  it("should extract key from valid brand color refs", () => {
    expect(parseBrandColorRef("{brand.colors.primary}")).toBe("primary");
    expect(parseBrandColorRef("{brand.colors.secondary}")).toBe("secondary");
    expect(parseBrandColorRef("{brand.colors.tertiary}")).toBe("tertiary");
  });

  it("should return null for non-brand-color values", () => {
    expect(parseBrandColorRef("#ff0000")).toBeNull();
    expect(parseBrandColorRef("transparent")).toBeNull();
    expect(parseBrandColorRef("")).toBeNull();
    expect(parseBrandColorRef("{brand.colors.quaternary}")).toBeNull();
  });

  it("should return null for brand.email refs (only parses brand.colors.*)", () => {
    expect(parseBrandColorRef("{brand.email.backgroundColor}")).toBeNull();
    expect(parseBrandColorRef("{brand.email.blocksBackgroundColor}")).toBeNull();
    expect(parseBrandColorRef("{brand.email.footerBackgroundColor}")).toBeNull();
  });
});

describe("makeBrandColorRef", () => {
  it("should create valid brand color ref strings", () => {
    expect(makeBrandColorRef("primary")).toBe("{brand.colors.primary}");
    expect(makeBrandColorRef("secondary")).toBe("{brand.colors.secondary}");
    expect(makeBrandColorRef("tertiary")).toBe("{brand.colors.tertiary}");
  });

  it("should produce refs that pass isBrandColorRef", () => {
    expect(isBrandColorRef(makeBrandColorRef("primary"))).toBe(true);
    expect(isBrandColorRef(makeBrandColorRef("secondary"))).toBe(true);
    expect(isBrandColorRef(makeBrandColorRef("tertiary"))).toBe(true);
  });
});

describe("getBrandColorLabel", () => {
  it("should return labels for valid brand color refs", () => {
    expect(getBrandColorLabel("{brand.colors.primary}")).toBe("Primary");
    expect(getBrandColorLabel("{brand.colors.secondary}")).toBe("Secondary");
    expect(getBrandColorLabel("{brand.colors.tertiary}")).toBe("Tertiary");
  });

  it("should return null for non-brand-color values", () => {
    expect(getBrandColorLabel("#ff0000")).toBeNull();
    expect(getBrandColorLabel("transparent")).toBeNull();
    expect(getBrandColorLabel("")).toBeNull();
    expect(getBrandColorLabel("Primary")).toBeNull();
  });

  it("should return null for brand.email refs (no label mapping yet)", () => {
    expect(getBrandColorLabel("{brand.email.backgroundColor}")).toBeNull();
    expect(getBrandColorLabel("{brand.email.blocksBackgroundColor}")).toBeNull();
    expect(getBrandColorLabel("{brand.email.footerBackgroundColor}")).toBeNull();
  });
});

describe("brandColorRefToCSSVar", () => {
  it("should convert brand refs to CSS variable names", () => {
    expect(brandColorRefToCSSVar("{brand.colors.primary}")).toBe("--courier-brand-color-primary");
    expect(brandColorRefToCSSVar("{brand.colors.secondary}")).toBe(
      "--courier-brand-color-secondary"
    );
    expect(brandColorRefToCSSVar("{brand.colors.tertiary}")).toBe("--courier-brand-color-tertiary");
  });

  it("should produce a fallback for non-brand strings", () => {
    const result = brandColorRefToCSSVar("#ff0000");
    expect(result).toBe("--courier-brand-color-#ff0000");
  });

  // brand.email.* refs are not parseable via parseBrandColorRef (which only handles
  // brand.colors.*), so brandColorRefToCSSVar currently falls back to embedding the
  // raw ref. This test pins that behavior — if it changes, the CSS-var consumers
  // must be updated accordingly.
  it("should fall back to embedding the raw ref for brand.email refs", () => {
    expect(brandColorRefToCSSVar("{brand.email.backgroundColor}")).toBe(
      "--courier-brand-color-{brand.email.backgroundColor}"
    );
    expect(brandColorRefToCSSVar("{brand.email.blocksBackgroundColor}")).toBe(
      "--courier-brand-color-{brand.email.blocksBackgroundColor}"
    );
    expect(brandColorRefToCSSVar("{brand.email.footerBackgroundColor}")).toBe(
      "--courier-brand-color-{brand.email.footerBackgroundColor}"
    );
  });
});

describe("brandColorsToCSSVars", () => {
  it("should return empty object for empty array", () => {
    expect(brandColorsToCSSVars([])).toEqual({});
  });

  it("should convert brand colors to CSS variable map", () => {
    const brandColors: BrandColor[] = [
      { key: "primary", hex: "#ff0000", ref: "{brand.colors.primary}" },
      { key: "secondary", hex: "#00ff00", ref: "{brand.colors.secondary}" },
    ];

    expect(brandColorsToCSSVars(brandColors)).toEqual({
      "--courier-brand-color-primary": "#ff0000",
      "--courier-brand-color-secondary": "#00ff00",
    });
  });

  it("should handle all three brand colors", () => {
    const brandColors: BrandColor[] = [
      { key: "primary", hex: "#111111", ref: "{brand.colors.primary}" },
      { key: "secondary", hex: "#222222", ref: "{brand.colors.secondary}" },
      { key: "tertiary", hex: "#333333", ref: "{brand.colors.tertiary}" },
    ];

    const result = brandColorsToCSSVars(brandColors);
    expect(Object.keys(result)).toHaveLength(3);
    expect(result["--courier-brand-color-primary"]).toBe("#111111");
    expect(result["--courier-brand-color-secondary"]).toBe("#222222");
    expect(result["--courier-brand-color-tertiary"]).toBe("#333333");
  });
});

describe("resolveBrandColor", () => {
  const brandColorMap: Record<string, string> = {
    "{brand.colors.primary}": "#ff0000",
    "{brand.colors.secondary}": "#00ff00",
    "{brand.email.backgroundColor}": "#111111",
    "{brand.email.blocksBackgroundColor}": "#222222",
    "{brand.email.footerBackgroundColor}": "#333333",
  };

  it("should resolve brand refs to hex values", () => {
    expect(resolveBrandColor("{brand.colors.primary}", brandColorMap)).toBe("#ff0000");
    expect(resolveBrandColor("{brand.colors.secondary}", brandColorMap)).toBe("#00ff00");
  });

  it("should resolve brand.email refs to hex values", () => {
    expect(resolveBrandColor("{brand.email.backgroundColor}", brandColorMap)).toBe("#111111");
    expect(resolveBrandColor("{brand.email.blocksBackgroundColor}", brandColorMap)).toBe("#222222");
    expect(resolveBrandColor("{brand.email.footerBackgroundColor}", brandColorMap)).toBe("#333333");
  });

  it("should return the ref itself when not found in map", () => {
    expect(resolveBrandColor("{brand.colors.tertiary}", brandColorMap)).toBe(
      "{brand.colors.tertiary}"
    );
  });

  it("should pass through hex colors unchanged", () => {
    expect(resolveBrandColor("#abcdef", brandColorMap)).toBe("#abcdef");
    expect(resolveBrandColor("#fff", brandColorMap)).toBe("#fff");
  });

  it("should pass through other non-brand values unchanged", () => {
    expect(resolveBrandColor("transparent", brandColorMap)).toBe("transparent");
    expect(resolveBrandColor("red", brandColorMap)).toBe("red");
    expect(resolveBrandColor("", brandColorMap)).toBe("");
  });

  it("should work with empty map", () => {
    expect(resolveBrandColor("{brand.colors.primary}", {})).toBe("{brand.colors.primary}");
    expect(resolveBrandColor("{brand.email.backgroundColor}", {})).toBe(
      "{brand.email.backgroundColor}"
    );
    expect(resolveBrandColor("#ff0000", {})).toBe("#ff0000");
  });
});
