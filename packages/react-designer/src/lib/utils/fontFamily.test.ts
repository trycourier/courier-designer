import { describe, it, expect } from "vitest";
import { parseFontFamily, buildFontFamily } from "./fontFamily";

describe("parseFontFamily", () => {
  it("returns empty primary and default fallback for null/undefined", () => {
    expect(parseFontFamily(null)).toEqual({ primary: "", fallback: "sans-serif" });
    expect(parseFontFamily(undefined)).toEqual({ primary: "", fallback: "sans-serif" });
    expect(parseFontFamily("")).toEqual({ primary: "", fallback: "sans-serif" });
  });

  it("parses two-part font family (primary + generic)", () => {
    expect(parseFontFamily("Roboto, sans-serif")).toEqual({
      primary: "Roboto",
      fallback: "sans-serif",
    });
  });

  it("parses three-part font family (primary + email-safe + generic)", () => {
    expect(parseFontFamily("Roboto, Georgia, serif")).toEqual({
      primary: "Roboto",
      fallback: "Georgia, serif",
    });
  });

  it("parses system font with full fallback stack", () => {
    expect(parseFontFamily("Helvetica, Arial, sans-serif")).toEqual({
      primary: "Helvetica",
      fallback: "Arial, sans-serif",
    });
  });

  it("handles quoted font names", () => {
    expect(parseFontFamily("'Dancing Script', Arial, sans-serif")).toEqual({
      primary: "'Dancing Script'",
      fallback: "Arial, sans-serif",
    });
  });

  it("handles single font name without fallback", () => {
    expect(parseFontFamily("Roboto")).toEqual({
      primary: "Roboto",
      fallback: "sans-serif",
    });
  });

  it("handles the default EMAIL_EDITOR_FONT_FAMILY", () => {
    expect(parseFontFamily("Helvetica, Arial, sans-serif")).toEqual({
      primary: "Helvetica",
      fallback: "Arial, sans-serif",
    });
  });
});

describe("buildFontFamily", () => {
  it("builds a simple primary + generic string", () => {
    expect(buildFontFamily("Roboto", "sans-serif")).toBe("Roboto, sans-serif");
  });

  it("builds primary + email-safe + generic string", () => {
    expect(buildFontFamily("Roboto", "Georgia, serif")).toBe("Roboto, Georgia, serif");
  });

  it("builds primary + full system font stack", () => {
    expect(buildFontFamily("Inter", "Helvetica, Arial, sans-serif")).toBe(
      "Inter, Helvetica, Arial, sans-serif"
    );
  });
});

describe("roundtrip: parse → rebuild with new primary", () => {
  it("preserves fallback stack when changing primary font", () => {
    const original = "Roboto, Georgia, serif";
    const { fallback } = parseFontFamily(original);
    const rebuilt = buildFontFamily("Inter", fallback);
    expect(rebuilt).toBe("Inter, Georgia, serif");
  });

  it("preserves fallback stack when changing primary on system font", () => {
    const original = "Helvetica, Arial, sans-serif";
    const { fallback } = parseFontFamily(original);
    const rebuilt = buildFontFamily("Montserrat", fallback);
    expect(rebuilt).toBe("Montserrat, Arial, sans-serif");
  });
});

describe("roundtrip: parse → rebuild with new fallback", () => {
  it("replaces fallback while keeping primary", () => {
    const original = "Roboto, sans-serif";
    const { primary } = parseFontFamily(original);
    const rebuilt = buildFontFamily(primary, "Georgia, serif");
    expect(rebuilt).toBe("Roboto, Georgia, serif");
  });
});
