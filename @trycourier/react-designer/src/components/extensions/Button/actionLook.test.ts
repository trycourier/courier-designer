import { describe, expect, it } from "vitest";
import { actionLookClassName, actionLookFromStyle } from "./actionLook";

describe("actionLookClassName", () => {
  it("names a class per style, so the kit's rules can be expressed in CSS", () => {
    // Hover, active and dark mode cannot be inline styles, and matching the delivered button
    // means matching its pointer states — so the look lives in `styles.css`.
    expect(actionLookClassName("button")).toContain("courier-inbox-action--button");
    expect(actionLookClassName("secondary")).toContain("courier-inbox-action--secondary");
    expect(actionLookClassName("tertiary")).toContain("courier-inbox-action--tertiary");
    expect(actionLookClassName("link")).toContain("courier-inbox-action--link");
  });

  it("carries the shared base class alongside the per-style one", () => {
    expect(actionLookClassName("secondary").split(" ")).toContain("courier-inbox-action");
  });

  it("falls back to the filled default for an unknown style rather than drawing nothing", () => {
    expect(actionLookClassName(undefined)).toContain("courier-inbox-action--button");
  });
});

describe("actionLookFromStyle", () => {
  it("returns nothing at all for an action with no colors of its own", () => {
    // The whole point: a default Inbox action stays on the kit's styling, which follows the
    // viewer's mode. Any value here would outrank the theme and freeze one palette in.
    (["button", "secondary", "tertiary", "link"] as const).forEach((style) => {
      expect(actionLookFromStyle(style, undefined, undefined)).toEqual({});
    });
  });

  it("fills with the accent when a filled action names one", () => {
    expect(actionLookFromStyle("button", "#9D3789", "#FFFFFF")).toEqual({
      backgroundColor: "#9D3789",
      color: "#FFFFFF",
      // Transparent, but present: the border box is reserved either way, so the button keeps
      // the size it had before the styles existed. This path is the email button's.
      border: "1px solid transparent",
    });
  });

  it("puts a secondary action's accent on the outline and the label, never the fill", () => {
    // Mirrors the renderers: for an outlined button the color is the border and the text.
    expect(actionLookFromStyle("secondary", "#9D3789", undefined)).toEqual({
      color: "#9D3789",
      border: "1px solid #9D3789",
    });
  });

  it("puts a tertiary action's accent on the label only — it draws no box", () => {
    expect(actionLookFromStyle("tertiary", "#9D3789", undefined)).toEqual({ color: "#9D3789" });
  });

  it("colors a link's text and gives it no chrome", () => {
    expect(actionLookFromStyle("link", undefined, "#9D3789")).toEqual({ color: "#9D3789" });
  });

  it("keeps a white filled button visible, as it always has", () => {
    // Predates the styles and was never Inbox-specific: a white email button relies on this
    // hairline, or it vanishes against the editor's own light surface.
    expect(actionLookFromStyle("button", "#ffffff", "#000000")).toEqual({
      backgroundColor: "#ffffff",
      color: "#000000",
      border: "1px solid #000000",
    });
  });

  it("reserves a transparent border box for a colored fill, as it always has", () => {
    expect(actionLookFromStyle("button", "#0085FF", "#ffffff").border).toBe(
      "1px solid transparent"
    );
  });
});
