import { describe, it, expect } from "vitest";
import {
  INBOX_BUTTON_COLORS,
  INBOX_FILLED,
  INBOX_OUTLINED,
  inboxStyleFromBackground,
  inboxStyleToElementalStyle,
  isOutlinedInboxBackground,
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
});
