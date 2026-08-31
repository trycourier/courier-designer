import { describe, expect, it } from "vitest";
import { actionLookFromStyle } from "./actionLook";

const ACCENT = "#000000";
const LABEL = "#ffffff";

describe("actionLookFromStyle", () => {
  it("fills with the accent for the default button", () => {
    expect(actionLookFromStyle("button", ACCENT, LABEL)).toEqual({
      backgroundColor: ACCENT,
      color: LABEL,
      border: "1px solid transparent",
    });
  });

  it("turns the accent into the outline and the label for secondary", () => {
    // Mirrors the email partial: border="1px solid {bg}" color="{bg}", no fill.
    expect(actionLookFromStyle("secondary", ACCENT, LABEL)).toEqual({
      backgroundColor: "transparent",
      color: ACCENT,
      border: `1px solid ${ACCENT}`,
    });
  });

  it("draws tertiary as a rule under the label rather than a box around it", () => {
    const look = actionLookFromStyle("tertiary", ACCENT, LABEL);
    expect(look.backgroundColor).toBe("transparent");
    expect(look.color).toBe(ACCENT);
    expect(look.borderBottom).toBe(`2px solid ${ACCENT}`);
  });

  it("draws a link as underlined text with no chrome", () => {
    const look = actionLookFromStyle("link", ACCENT, LABEL);
    expect(look.backgroundColor).toBe("transparent");
    expect(look.textDecoration).toBe("underline");
    expect(look.border).toBe("1px solid transparent");
  });

  it("keeps a border box on every style so a mixed row lines up", () => {
    (["button", "secondary", "tertiary", "link"] as const).forEach((style) => {
      const look = actionLookFromStyle(style, ACCENT, LABEL);
      expect(String(look.border)).toContain("1px solid");
    });
  });

  it("falls back to the filled look for an unknown style rather than drawing nothing", () => {
    const look = actionLookFromStyle(undefined, ACCENT, LABEL);
    expect(look.backgroundColor).toBe(ACCENT);
    expect(look.color).toBe(LABEL);
  });

  it("substitutes the accent when an action carries no colour of its own", () => {
    expect(actionLookFromStyle("secondary", undefined, undefined).border).toBe(
      `1px solid ${ACCENT}`
    );
  });
});
