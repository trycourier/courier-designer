import { describe, expect, it } from "vitest";
import {
  formatPaddingVH,
  formatPxValue,
  lineHeightToPx,
  paddingShorthandToVH,
  parsePaddingShorthand,
  parsePxValue,
} from "./cssValues";

describe("parsePxValue", () => {
  it("parses px values", () => {
    expect(parsePxValue("18px")).toBe(18);
    expect(parsePxValue("18.72px")).toBe(18.72);
    expect(parsePxValue(" 20px ")).toBe(20);
  });

  it("rejects anything the renderer would drop", () => {
    for (const value of ["18", "1.5em", "50%", "0", "", null, undefined]) {
      expect(parsePxValue(value)).toBeUndefined();
    }
  });
});

describe("formatPxValue", () => {
  it("serializes positive numbers", () => {
    expect(formatPxValue(18)).toBe("18px");
    expect(formatPxValue(18.5)).toBe("18.5px");
  });

  it("treats zero, null and NaN as unset", () => {
    expect(formatPxValue(0)).toBeUndefined();
    expect(formatPxValue(-4)).toBeUndefined();
    expect(formatPxValue(null)).toBeUndefined();
    expect(formatPxValue(Number.NaN)).toBeUndefined();
  });

  it("drops values that would serialize to exponential notation", () => {
    // `${1e21}` is "1e+21", which fails CSS_PX_REGEX and would be silently
    // discarded at render time. 1e21 is legal input for <input type="number">.
    expect(formatPxValue(1e21)).toBeUndefined();
    expect(formatPxValue(Number.MAX_VALUE)).toBeUndefined();
    expect(formatPxValue(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe("lineHeightToPx", () => {
  it("passes px values through", () => {
    expect(lineHeightToPx("24px", 16)).toBe(24);
  });

  it("resolves a unitless multiplier against the effective font size", () => {
    expect(lineHeightToPx("1.5", 16)).toBe(24);
    expect(lineHeightToPx("2", 14)).toBe(28);
    // rounds, since the editor stores px integers
    expect(lineHeightToPx("1.3", 18.72)).toBe(24);
  });

  it("rejects invalid values", () => {
    expect(lineHeightToPx("1.5em", 16)).toBeUndefined();
    expect(lineHeightToPx("0", 16)).toBeUndefined();
    expect(lineHeightToPx(undefined, 16)).toBeUndefined();
  });
});

describe("parsePaddingShorthand", () => {
  it("expands 1-4 value shorthands", () => {
    expect(parsePaddingShorthand("8px")).toEqual({
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
    });
    expect(parsePaddingShorthand("8px 30px")).toEqual({
      top: 8,
      right: 30,
      bottom: 8,
      left: 30,
    });
    expect(parsePaddingShorthand("8px 30px 16px")).toEqual({
      top: 8,
      right: 30,
      bottom: 16,
      left: 30,
    });
    expect(parsePaddingShorthand("8px 30px 16px 40px")).toEqual({
      top: 8,
      right: 30,
      bottom: 16,
      left: 40,
    });
  });

  it("accepts a bare zero", () => {
    expect(parsePaddingShorthand("0 30px")).toEqual({
      top: 0,
      right: 30,
      bottom: 0,
      left: 30,
    });
  });

  it("rejects units the renderer would drop", () => {
    expect(parsePaddingShorthand("16 32")).toBeUndefined();
    expect(parsePaddingShorthand("10% 30px")).toBeUndefined();
    expect(parsePaddingShorthand("1.5em")).toBeUndefined();
    expect(parsePaddingShorthand("1px 2px 3px 4px 5px")).toBeUndefined();
  });
});

describe("paddingShorthandToVH", () => {
  it("collapses to the vertical/horizontal pair the Frame control edits", () => {
    expect(paddingShorthandToVH("0 30px")).toEqual({ vertical: 0, horizontal: 30 });
    expect(paddingShorthandToVH("12px")).toEqual({ vertical: 12, horizontal: 12 });
  });

  it("falls back to top/left for asymmetric shorthands", () => {
    expect(paddingShorthandToVH("8px 30px 16px 40px")).toEqual({
      vertical: 8,
      horizontal: 40,
    });
  });

  it("returns undefined when unset or invalid", () => {
    expect(paddingShorthandToVH(null)).toBeUndefined();
    expect(paddingShorthandToVH("bogus")).toBeUndefined();
  });
});

describe("formatPaddingVH", () => {
  it("writes the shorthand the renderer validates", () => {
    expect(formatPaddingVH(0, 30)).toBe("0px 30px");
    expect(formatPaddingVH(12, 0)).toBe("12px 0px");
  });

  it("clamps negatives to zero", () => {
    expect(formatPaddingVH(-5, -1)).toBe("0px 0px");
  });

  it("clamps absurd values so the shorthand never goes exponential", () => {
    expect(formatPaddingVH(1e21, 30)).toBe("10000px 30px");
    expect(formatPaddingVH(Number.NaN, 30)).toBe("0px 30px");
  });
});
