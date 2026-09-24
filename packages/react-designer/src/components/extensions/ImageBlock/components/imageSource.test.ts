import { describe, expect, it } from "vitest";
import { isUnprobableSource, sourceOnlyUpdate } from "./imageSource";

describe("a source the editor cannot probe", () => {
  it("recognises a handlebars source", () => {
    expect(isUnprobableSource("{{data.hero}}")).toBe(true);
    expect(isUnprobableSource("https://example.com/a.png?v={{data.v}}")).toBe(true);
    expect(isUnprobableSource("https://example.com/a.png")).toBe(false);
    expect(isUnprobableSource("")).toBe(false);
  });

  /**
   * `img.onerror` used to return without storing anything, so typing a
   * handlebars URL — which can never load in the browser — left the node with
   * its old source and the author's input silently vanished on blur.
   */
  it("stores the source and keeps the width already chosen", () => {
    expect(sourceOnlyUpdate({ alt: "x", width: 60 }, "{{data.hero}}")).toEqual({
      alt: "x",
      width: 60,
      sourcePath: "{{data.hero}}",
    });
  });

  it("falls back to full width when none has been measured", () => {
    expect(sourceOnlyUpdate({ width: 0 }, "{{data.hero}}").width).toBe(100);
    expect(sourceOnlyUpdate({}, "{{data.hero}}").width).toBe(100);
  });
});
