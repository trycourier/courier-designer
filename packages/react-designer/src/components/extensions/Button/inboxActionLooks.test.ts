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
  // `primary` variant: the ink of the mode it is not.
  describe("button — the filled button", () => {
    it("wears the mode's ink, not its surface", () => {
      expect(rule(".courier-inbox-action--button")).toContain(
        `background-color: ${KIT_THEME.light.primary.toLowerCase()}`
      );
      expect(rule(".dark .courier-inbox-action--button")).toContain(
        `background-color: ${KIT_THEME.dark.primary.toLowerCase()}`
      );
    });

    // No edge of its own, but it still reserves the border box so it lines up with an outlined
    // sibling in the same row.
    it("draws no edge and sits flat", () => {
      const declarations = rule(".courier-inbox-action--button");
      expect(declarations).toContain("border: 1px solid transparent");
      expect(declarations).toContain("box-shadow: none");
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

    it("is not the filled button", () => {
      expect(rule(".courier-inbox-action--secondary")).not.toEqual(
        rule(".courier-inbox-action--button")
      );
    });
  });

  describe("tertiary and link, the quieter two", () => {
    it("draws tertiary as a borderless button", () => {
      const declarations = rule(".courier-inbox-action--tertiary");
      expect(declarations).toContain("background-color: transparent");
      expect(declarations).toContain("border: 1px solid transparent");
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
