import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { KIT_COLORS, KIT_THEME } from "./courierKitStyles";

/**
 * The canvas is a preview of `CourierButton`, so the four Inbox action looks have to be the ones
 * the kit draws. Nothing here can reach into `@trycourier/courier-ui-core` — the kit ships to the
 * browser and this stylesheet is built here — so the values are transcribed, and transcriptions
 * drift silently. These assertions are the thing that makes the drift loud.
 *
 * Mirrors `CourierButtonVariants` in `courier-ui-core/src/components/courier-button.ts` and the
 * style-to-variant mapping in `utils/action-styles.ts`.
 */
const css = fs.readFileSync(path.join(__dirname, "../../../styles.css"), "utf8");

/** The declarations of one rule, whitespace flattened. */
const rule = (selector: string): string => {
  const found = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css);
  if (!found) throw new Error(`no rule for ${selector}`);
  return found[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
};

describe("the Inbox action looks match the kit", () => {
  // `secondary` variant: the mode's surface, edged with the divider hairline. What an Inbox
  // action rendered as before any of these styles existed.
  describe("button — the plain button", () => {
    // Transparent, not the mode's surface: the Inbox row is transparent too, so the action sits
    // on whatever the inbox is embedded in rather than becoming a chip on it.
    it("rests on transparent", () => {
      expect(rule(".courier-inbox-action--button")).toContain("background-color: transparent");
      expect(rule(".courier-inbox-action--secondary")).toContain("background-color: transparent");
    });

    it("is edged with the divider hairline", () => {
      expect(rule(".courier-inbox-action--button")).toContain(
        `border: 1px solid ${KIT_THEME.light.border.toLowerCase()}`
      );
      expect(rule(".dark .courier-inbox-action--button")).toContain(
        `border: 1px solid ${KIT_THEME.dark.border.toLowerCase()}`
      );
    });

    it("floats", () => {
      expect(rule(".courier-inbox-action--button")).toContain("box-shadow: 0px 1px 2px");
    });
  });

  // `outlined` variant. The hairline would be invisible here, so the edge steps up — and to a
  // different gray per mode, since one value cannot read the same on both faces.
  describe("secondary — the outlined button", () => {
    it("draws an edge you can see, pitched to the mode", () => {
      expect(rule(".courier-inbox-action--secondary")).toContain(
        `border: 1px solid ${KIT_COLORS.gray600.toLowerCase()}`
      );
      expect(rule(".dark .courier-inbox-action--secondary")).toContain(
        `border: 1px solid ${KIT_COLORS.gray650.toLowerCase()}`
      );
    });

    // An outline is the whole statement; a shadow underneath it would be a second one.
    it("sits flat", () => {
      expect(rule(".courier-inbox-action--secondary")).toContain("box-shadow: none");
      expect(rule(".dark .courier-inbox-action--secondary")).toContain("box-shadow: none");
    });

    it("is not the plain button", () => {
      expect(rule(".courier-inbox-action--secondary")).not.toEqual(
        rule(".courier-inbox-action--button")
      );
    });
  });

  describe("tertiary and link", () => {
    it("draws tertiary as the solid, high-contrast button", () => {
      expect(rule(".courier-inbox-action--tertiary")).toContain(
        `background-color: ${KIT_THEME.light.primary.toLowerCase()}`
      );
      expect(rule(".dark .courier-inbox-action--tertiary")).toContain(
        `background-color: ${KIT_THEME.dark.primary.toLowerCase()}`
      );
      // No edge of its own, but it keeps the border box so it lines up with an outlined sibling.
      expect(rule(".courier-inbox-action--tertiary")).toContain("border: 1px solid transparent");
    });

    it("draws link as inline text", () => {
      const declarations = rule(".courier-inbox-action--link");
      expect(declarations).toContain("text-decoration: underline");
      expect(declarations).toContain("padding: 0");
    });
  });

  it("keeps the four looks distinct", () => {
    const looks = ["button", "secondary", "tertiary", "link"].map((style) =>
      rule(`.courier-inbox-action--${style}`)
    );
    expect(new Set(looks).size).toBe(4);
  });
});
