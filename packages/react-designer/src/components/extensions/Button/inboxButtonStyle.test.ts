import { describe, it, expect } from "vitest";
import {
  INBOX_BUTTON_COLORS,
  INBOX_FILLED,
  INBOX_OUTLINED,
  inboxStyleFromBackground,
  inboxStyleFromColors,
  inboxStyleToElementalStyle,
  isOutlinedInboxBackground,
  matchesFilledSentinel,
  matchesOutlinedSentinel,
} from "./inboxButtonStyle";

describe("inboxButtonStyle", () => {
  describe("constants", () => {
    it("exposes the filled style as black-on-white text on a black background", () => {
      expect(INBOX_FILLED).toEqual({
        backgroundColor: "#000000",
        textColor: "#ffffff",
      });
    });

    it("exposes the outlined style as black text on a white background", () => {
      expect(INBOX_OUTLINED).toEqual({
        backgroundColor: "#ffffff",
        textColor: "#000000",
      });
    });

    it("INBOX_BUTTON_COLORS maps each style key to its color pair", () => {
      expect(INBOX_BUTTON_COLORS.filled).toBe(INBOX_FILLED);
      expect(INBOX_BUTTON_COLORS.outlined).toBe(INBOX_OUTLINED);
    });
  });

  describe("isOutlinedInboxBackground", () => {
    it("returns true for the outlined sentinel color", () => {
      expect(isOutlinedInboxBackground("#ffffff")).toBe(true);
    });

    it("is case-insensitive (matches uppercase and mixed-case hex)", () => {
      expect(isOutlinedInboxBackground("#FFFFFF")).toBe(true);
      expect(isOutlinedInboxBackground("#FfFfFf")).toBe(true);
    });

    it("returns false for the filled sentinel color", () => {
      expect(isOutlinedInboxBackground("#000000")).toBe(false);
    });

    it("returns false for arbitrary non-sentinel colors", () => {
      expect(isOutlinedInboxBackground("#ff0000")).toBe(false);
      expect(isOutlinedInboxBackground("rgb(255, 255, 255)")).toBe(false);
      expect(isOutlinedInboxBackground("white")).toBe(false);
    });

    it("returns false for non-string values without throwing", () => {
      expect(isOutlinedInboxBackground(undefined)).toBe(false);
      expect(isOutlinedInboxBackground(null)).toBe(false);
      expect(isOutlinedInboxBackground("")).toBe(false);
      expect(isOutlinedInboxBackground(0)).toBe(false);
      expect(isOutlinedInboxBackground({})).toBe(false);
    });
  });

  describe("inboxStyleToElementalStyle", () => {
    it('maps "filled" to the Elemental "button" style', () => {
      expect(inboxStyleToElementalStyle("filled")).toBe("button");
    });

    it('maps "outlined" to the Elemental "link" style', () => {
      expect(inboxStyleToElementalStyle("outlined")).toBe("link");
    });
  });

  describe("inboxStyleFromBackground", () => {
    it('returns "link" when the background matches the outlined sentinel', () => {
      expect(inboxStyleFromBackground("#ffffff")).toBe("link");
      expect(inboxStyleFromBackground("#FFFFFF")).toBe("link");
    });

    it('returns "button" for the filled sentinel and any other value', () => {
      expect(inboxStyleFromBackground("#000000")).toBe("button");
      expect(inboxStyleFromBackground("#ff0000")).toBe("button");
      expect(inboxStyleFromBackground(undefined)).toBe("button");
      expect(inboxStyleFromBackground(null)).toBe("button");
    });

    it("agrees with isOutlinedInboxBackground for any input", () => {
      const samples = ["#ffffff", "#FFFFFF", "#000000", "#abcdef", undefined, null, ""];
      for (const sample of samples) {
        const expected = isOutlinedInboxBackground(sample) ? "link" : "button";
        expect(inboxStyleFromBackground(sample)).toBe(expected);
      }
    });
  });

  describe("matchesOutlinedSentinel", () => {
    it("returns true only when both bg and text color match the outlined sentinel", () => {
      expect(matchesOutlinedSentinel("#ffffff", "#000000")).toBe(true);
    });

    it("is case-insensitive on both color values", () => {
      expect(matchesOutlinedSentinel("#FFFFFF", "#000000")).toBe(true);
      expect(matchesOutlinedSentinel("#ffffff", "#000")).toBe(false); // shorthand not supported
      expect(matchesOutlinedSentinel("#FfFfFf", "#000000")).toBe(true);
      expect(matchesOutlinedSentinel("#ffffff", "#000000".toUpperCase())).toBe(true);
    });

    it("returns false when only the background matches (the lone-#ffffff trap)", () => {
      expect(matchesOutlinedSentinel("#ffffff", "#ff0000")).toBe(false);
      expect(matchesOutlinedSentinel("#ffffff", undefined)).toBe(false);
      expect(matchesOutlinedSentinel("#ffffff", null)).toBe(false);
      expect(matchesOutlinedSentinel("#ffffff", "")).toBe(false);
    });

    it("returns false when only the text color matches", () => {
      expect(matchesOutlinedSentinel("#fafafa", "#000000")).toBe(false);
      expect(matchesOutlinedSentinel(undefined, "#000000")).toBe(false);
    });

    it("returns false for non-string inputs", () => {
      expect(matchesOutlinedSentinel(undefined, undefined)).toBe(false);
      expect(matchesOutlinedSentinel(null, null)).toBe(false);
      expect(matchesOutlinedSentinel({}, {})).toBe(false);
    });
  });

  describe("matchesFilledSentinel", () => {
    it("returns true only when both bg and text color match the filled sentinel", () => {
      expect(matchesFilledSentinel("#000000", "#ffffff")).toBe(true);
      expect(matchesFilledSentinel("#000000", "#FFFFFF")).toBe(true);
      expect(matchesFilledSentinel("#000000", "#fff")).toBe(false); // shorthand not supported
    });

    it("returns false when only one half of the pair matches", () => {
      expect(matchesFilledSentinel("#000000", "#fafafa")).toBe(false);
      expect(matchesFilledSentinel("#111111", "#ffffff")).toBe(false);
    });

    it("returns false for non-string inputs", () => {
      expect(matchesFilledSentinel(undefined, undefined)).toBe(false);
      expect(matchesFilledSentinel(null, "#ffffff")).toBe(false);
    });
  });

  describe("inboxStyleFromColors", () => {
    it('returns "link" only for the outlined sentinel pair', () => {
      expect(inboxStyleFromColors("#ffffff", "#000000")).toBe("link");
      expect(inboxStyleFromColors("#FFFFFF", "#000000")).toBe("link");
    });

    it('returns "button" only for the filled sentinel pair', () => {
      expect(inboxStyleFromColors("#000000", "#ffffff")).toBe("button");
      expect(inboxStyleFromColors("#000000", "#FFFFFF")).toBe("button");
    });

    it("returns undefined when colors do not form a known sentinel pair (Comment 1 contract)", () => {
      // The whole point of the paired sentinel: a stray #ffffff bg outside
      // the Inbox contract must NOT get tagged as a link, so callers can
      // safely omit `style` from their backend payload.
      expect(inboxStyleFromColors("#ffffff", "#ff0000")).toBeUndefined();
      expect(inboxStyleFromColors("#000000", "#abcdef")).toBeUndefined();
      expect(inboxStyleFromColors("#abcdef", "#fedcba")).toBeUndefined();
    });

    it("returns undefined when either color is missing", () => {
      expect(inboxStyleFromColors("#ffffff", undefined)).toBeUndefined();
      expect(inboxStyleFromColors(undefined, "#000000")).toBeUndefined();
      expect(inboxStyleFromColors(undefined, undefined)).toBeUndefined();
      expect(inboxStyleFromColors("", "")).toBeUndefined();
    });

    it("agrees with matchesOutlinedSentinel / matchesFilledSentinel", () => {
      const cases: Array<[unknown, unknown]> = [
        ["#ffffff", "#000000"],
        ["#000000", "#ffffff"],
        ["#ffffff", "#ff0000"],
        ["#000000", "#abcdef"],
        ["#abcdef", "#000000"],
        [undefined, "#000000"],
        ["#ffffff", undefined],
        [null, null],
      ];
      for (const [bg, color] of cases) {
        const result = inboxStyleFromColors(bg, color);
        if (matchesOutlinedSentinel(bg, color)) {
          expect(result).toBe("link");
        } else if (matchesFilledSentinel(bg, color)) {
          expect(result).toBe("button");
        } else {
          expect(result).toBeUndefined();
        }
      }
    });
  });
});
