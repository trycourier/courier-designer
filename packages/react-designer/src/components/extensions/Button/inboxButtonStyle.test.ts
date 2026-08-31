import { describe, expect, it } from "vitest";
import {
  INBOX_ACCENT,
  INBOX_BUTTON_PRESETS,
  INBOX_BUTTON_STYLES,
  INBOX_FILLED,
  INBOX_LEGACY_OUTLINED,
  INBOX_ON_ACCENT,
  inboxStyleFromColors,
  inboxStyleFromElementalStyle,
  isLegacyOutlinedBackground,
} from "./inboxButtonStyle";

describe("inboxButtonStyle", () => {
  describe("the style vocabulary", () => {
    it("is Elemental's own, in the order the sidebar shows them", () => {
      expect(INBOX_BUTTON_STYLES).toEqual(["button", "secondary", "tertiary", "link"]);
    });

    it("has a preset for every style it offers", () => {
      INBOX_BUTTON_STYLES.forEach((style) => {
        expect(INBOX_BUTTON_PRESETS[style]).toBeDefined();
      });
    });
  });

  describe("presets", () => {
    it("gives the filled button the accent as its fill and a contrasting label", () => {
      expect(INBOX_BUTTON_PRESETS.button).toEqual({
        backgroundColor: INBOX_ACCENT,
        textColor: INBOX_ON_ACCENT,
        bordered: false,
      });
    });

    it("colours the outlined button with the accent rather than filling it white", () => {
      // The whole point of the change: white here reaches both renderers as a white border and
      // a white label, which is invisible. See the module docs.
      expect(INBOX_BUTTON_PRESETS.secondary.backgroundColor).toBe(INBOX_ACCENT);
      expect(INBOX_BUTTON_PRESETS.secondary.backgroundColor).not.toBe("#ffffff");
      expect(INBOX_BUTTON_PRESETS.secondary.bordered).toBe(true);
    });

    it("gives tertiary the same accent, drawn as a rule rather than a box", () => {
      expect(INBOX_BUTTON_PRESETS.tertiary.backgroundColor).toBe(INBOX_ACCENT);
      expect(INBOX_BUTTON_PRESETS.tertiary.bordered).toBe(false);
    });

    it("gives a link the accent too, so both emit paths write the same field", () => {
      // No renderer reads it for a link, but the sidebar and the canvas converter both emit
      // these actions and must not disagree about which fields exist.
      expect(INBOX_BUTTON_PRESETS.link.backgroundColor).toBe(INBOX_ACCENT);
    });

    it("gives every style a background, so no emit path has to special-case one", () => {
      INBOX_BUTTON_STYLES.forEach((style) => {
        expect(INBOX_BUTTON_PRESETS[style].backgroundColor).toBe(INBOX_ACCENT);
      });
    });
  });

  describe("isLegacyOutlinedBackground", () => {
    it("matches the white the old encoding used as its marker", () => {
      expect(isLegacyOutlinedBackground("#ffffff")).toBe(true);
      expect(isLegacyOutlinedBackground("#FFFFFF")).toBe(true);
      expect(isLegacyOutlinedBackground("#FfFfFf")).toBe(true);
    });

    it("does not match anything a current preset writes", () => {
      Object.values(INBOX_BUTTON_PRESETS).forEach((preset) => {
        expect(isLegacyOutlinedBackground(preset.backgroundColor)).toBe(false);
      });
    });

    it("does not match other spellings of white, which the marker never used", () => {
      expect(isLegacyOutlinedBackground("rgb(255, 255, 255)")).toBe(false);
      expect(isLegacyOutlinedBackground("white")).toBe(false);
      expect(isLegacyOutlinedBackground("#fff")).toBe(false);
    });

    it("returns false for non-string values without throwing", () => {
      expect(isLegacyOutlinedBackground(undefined)).toBe(false);
      expect(isLegacyOutlinedBackground(null)).toBe(false);
      expect(isLegacyOutlinedBackground("")).toBe(false);
      expect(isLegacyOutlinedBackground(0)).toBe(false);
      expect(isLegacyOutlinedBackground({})).toBe(false);
    });
  });

  describe("inboxStyleFromElementalStyle", () => {
    it("takes secondary and tertiary at their word, whatever colour they carry", () => {
      expect(inboxStyleFromElementalStyle("secondary", undefined)).toBe("secondary");
      expect(inboxStyleFromElementalStyle("secondary", "#ff0000")).toBe("secondary");
      expect(inboxStyleFromElementalStyle("tertiary", undefined)).toBe("tertiary");
      expect(inboxStyleFromElementalStyle("tertiary", "#ff0000")).toBe("tertiary");
    });

    it("reads button as the filled default", () => {
      expect(inboxStyleFromElementalStyle("button", INBOX_ACCENT)).toBe("button");
    });

    it("still reads the old link-plus-white encoding as outlined", () => {
      expect(inboxStyleFromElementalStyle("link", INBOX_LEGACY_OUTLINED.backgroundColor)).toBe(
        "secondary"
      );
      expect(inboxStyleFromElementalStyle("link", "#FFFFFF")).toBe("secondary");
    });

    it("leaves a link that never carried the marker as a link", () => {
      // Restyling one of these as a button would change what the author wrote.
      expect(inboxStyleFromElementalStyle("link", "#ff0000")).toBe("link");
      expect(inboxStyleFromElementalStyle("link", undefined)).toBe("link");
    });

    it("falls back to the filled default for a missing or unrecognised style", () => {
      expect(inboxStyleFromElementalStyle(undefined, undefined)).toBe("button");
      expect(inboxStyleFromElementalStyle(null, undefined)).toBe("button");
      expect(inboxStyleFromElementalStyle("totally-made-up", undefined)).toBe("button");
    });

    it("round-trips every style the sidebar can save", () => {
      INBOX_BUTTON_STYLES.forEach((style) => {
        const preset = INBOX_BUTTON_PRESETS[style];
        expect(inboxStyleFromElementalStyle(style, preset.backgroundColor)).toBe(style);
      });
    });
  });

  describe("inboxStyleFromColors", () => {
    it("recovers the two pairs a pre-attribute node could have been saved with", () => {
      expect(inboxStyleFromColors("#ffffff", "#000000")).toBe("secondary");
      expect(inboxStyleFromColors("#FFFFFF", "#000000")).toBe("secondary");
      expect(inboxStyleFromColors(INBOX_FILLED.backgroundColor, INBOX_FILLED.textColor)).toBe(
        "button"
      );
    });

    it("returns undefined for a pair it does not recognise, rather than guessing", () => {
      // A caller that gets undefined emits no style at all — a button outside the Inbox
      // contract must not be tagged as one of its styles.
      expect(inboxStyleFromColors("#ffffff", "#ff0000")).toBeUndefined();
      expect(inboxStyleFromColors("#000000", "#abcdef")).toBeUndefined();
      expect(inboxStyleFromColors("#abcdef", "#fedcba")).toBeUndefined();
    });

    it("needs both halves of the pair, so a lone white does not read as outlined", () => {
      expect(inboxStyleFromColors("#ffffff", undefined)).toBeUndefined();
      expect(inboxStyleFromColors(undefined, "#000000")).toBeUndefined();
      expect(inboxStyleFromColors(undefined, undefined)).toBeUndefined();
      expect(inboxStyleFromColors("", "")).toBeUndefined();
    });
  });
});
