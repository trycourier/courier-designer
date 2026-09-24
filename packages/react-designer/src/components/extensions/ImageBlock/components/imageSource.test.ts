import { describe, expect, it } from "vitest";
import { initialImageTab, isUnprobableSource, sourceOnlyUpdate } from "./imageSource";

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

/**
 * The sidebar opened on "From file" whatever the image was, so an image with a
 * handlebars or remote source showed an empty upload tab and the author could
 * not see the URL the block is actually using.
 */
describe("which tab the image sidebar opens on", () => {
  it("opens on the URL tab for a source that was typed", () => {
    expect(initialImageTab("{{data.hero}}")).toBe("url");
    expect(initialImageTab("https://example.com/a.png")).toBe("url");
  });

  it("opens on the file tab for an upload or an empty block", () => {
    expect(initialImageTab("data:image/png;base64,AAAA")).toBe("file");
    expect(initialImageTab("")).toBe("file");
  });
});

/**
 * The stored default width is 1, which shows as "1%" and renders a sliver. A
 * source that cannot be measured has no width to keep, so it takes the full
 * width rather than the placeholder default.
 */
describe("the width stored with an unmeasurable source", () => {
  it("replaces the 1% placeholder default", () => {
    expect(sourceOnlyUpdate({ width: 1 }, "{{data.hero}}").width).toBe(100);
  });

  it("keeps a width the author chose", () => {
    expect(sourceOnlyUpdate({ width: 60 }, "{{data.hero}}").width).toBe(60);
  });
});

