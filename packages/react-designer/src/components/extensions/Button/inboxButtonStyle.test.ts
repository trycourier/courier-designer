import { describe, it, expect } from "vitest";
import {
  INBOX_BUTTON_COLORS,
  INBOX_FILLED,
  INBOX_OUTLINED,
  inboxStyleFromColors,
  inboxStyleFromElementalStyle,
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

    it('maps "outlined" to the Elemental "secondary" style', () => {
      expect(inboxStyleToElementalStyle("outlined")).toBe("secondary");
    });
  });

  describe("inboxStyleFromElementalStyle", () => {
    it('reads "secondary" as outlined, whatever colour it carries', () => {
      expect(inboxStyleFromElementalStyle("secondary", undefined)).toBe("outlined");
      expect(inboxStyleFromElementalStyle("secondary", "#ff0000")).toBe("outlined");
      expect(inboxStyleFromElementalStyle("secondary", INBOX_FILLED.backgroundColor)).toBe(
        "outlined"
      );
    });

    it('reads "button" as filled', () => {
      expect(inboxStyleFromElementalStyle("button", INBOX_FILLED.backgroundColor)).toBe("filled");
    });

    // Templates saved before `secondary` existed encoded outlined as `link` plus the sentinel
    // background. They are still opened every day, so they still have to decode.
    it("still reads the legacy link-plus-sentinel encoding as outlined", () => {
      expect(inboxStyleFromElementalStyle("link", INBOX_OUTLINED.backgroundColor)).toBe("outlined");
      expect(inboxStyleFromElementalStyle("link", "#FFFFFF")).toBe("outlined");
    });

    // A link that never carried the sentinel was not an Inbox button style. Reading it as
    // outlined would silently restyle it.
    it("does not read a plain link as outlined", () => {
      expect(inboxStyleFromElementalStyle("link", "#ff0000")).toBe("filled");
      expect(inboxStyleFromElementalStyle("link", undefined)).toBe("filled");
    });

    it("falls back to filled for a missing or unrecognized style", () => {
      expect(inboxStyleFromElementalStyle(undefined, undefined)).toBe("filled");
      expect(inboxStyleFromElementalStyle(null, undefined)).toBe("filled");
      expect(inboxStyleFromElementalStyle("totally-made-up", undefined)).toBe("filled");
    });

    // A filled action arrives as `style: null` — the send pipeline omits the value when it
    // equals "button" — so the absent case is the common one, not an edge case.
    it("round-trips both styles through the encoder", () => {
      expect(inboxStyleFromElementalStyle(inboxStyleToElementalStyle("filled"), undefined)).toBe(
        "filled"
      );
      expect(inboxStyleFromElementalStyle(inboxStyleToElementalStyle("outlined"), undefined)).toBe(
        "outlined"
      );
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
    it('returns "secondary" only for the outlined sentinel pair', () => {
      expect(inboxStyleFromColors("#ffffff", "#000000")).toBe("secondary");
      expect(inboxStyleFromColors("#FFFFFF", "#000000")).toBe("secondary");
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
          expect(result).toBe("secondary");
        } else if (matchesFilledSentinel(bg, color)) {
          expect(result).toBe("button");
        } else {
          expect(result).toBeUndefined();
        }
      }
    });
  });
});
