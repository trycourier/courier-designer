import { describe, expect, it } from "vitest";
import { actionLookFromStyle } from "./actionLook";
import { KIT_BASE, KIT_INK, KIT_SURFACE } from "./courierKitStyles";

const ACCENT = KIT_INK;
const LABEL = KIT_SURFACE;

describe("actionLookFromStyle", () => {
  it("fills with the accent for the default button", () => {
    expect(actionLookFromStyle("button", ACCENT, LABEL)).toEqual({
      backgroundColor: ACCENT,
      color: LABEL,
      border: "1px solid transparent",
      fontWeight: KIT_BASE.fontWeight,
    });
  });

  it("puts the accent on the outline and the label for secondary, over the kit surface", () => {
    // `courierActionButtonProps` gives an outlined action no fill of its own, so the kit's
    // surface shows through and the accent becomes the border and the label.
    expect(actionLookFromStyle("secondary", ACCENT, LABEL)).toEqual({
      backgroundColor: KIT_SURFACE,
      color: ACCENT,
      border: `1px solid ${ACCENT}`,
      fontWeight: KIT_BASE.fontWeight,
    });
  });

  it("draws tertiary exactly like secondary, because the Inbox does", () => {
    // `outlinedByStyle = style === 'secondary' || style === 'tertiary'` — the two are one
    // branch in the kit. Email is the only renderer that tells them apart.
    expect(actionLookFromStyle("tertiary", ACCENT, LABEL)).toEqual(
      actionLookFromStyle("secondary", ACCENT, LABEL)
    );
  });

  it("gives a link no chrome at all", () => {
    const look = actionLookFromStyle("link", ACCENT, LABEL);
    expect(look.backgroundColor).toBe("transparent");
    expect(look.border).toBe("none");
    expect(look.padding).toBe("0px");
    expect(look.textDecoration).toBe("underline");
  });

  it("keeps a border box on every style but link, so a mixed row lines up", () => {
    (["button", "secondary", "tertiary"] as const).forEach((style) => {
      expect(String(actionLookFromStyle(style, ACCENT, LABEL).border)).toContain("1px solid");
    });
  });

  it("falls back to the filled look for an unknown style rather than drawing nothing", () => {
    const look = actionLookFromStyle(undefined, ACCENT, LABEL);
    expect(look.backgroundColor).toBe(ACCENT);
    expect(look.color).toBe(LABEL);
  });

  it("substitutes the kit ink when an action carries no colour of its own", () => {
    expect(actionLookFromStyle("secondary", undefined, undefined).border).toBe(
      `1px solid ${KIT_INK}`
    );
    expect(actionLookFromStyle("link", undefined, undefined).color).toBe(KIT_INK);
  });
});
