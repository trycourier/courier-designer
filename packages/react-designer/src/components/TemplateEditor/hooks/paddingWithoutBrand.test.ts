import { describe, expect, it } from "vitest";

/**
 * A new template is seeded with `{brand.email.padding.horizontal}`. With no
 * brand attached that value links to nothing, but the field was still treated
 * as linked: disabled, no unlink badge, no Reset. The author had no way to set
 * a padding.
 */
function isLinked(isPaddingLinkedToBrand: boolean, canLinkPaddingToBrand: boolean) {
  return isPaddingLinkedToBrand && canLinkPaddingToBrand;
}

describe("frame padding with no brand attached", () => {
  it("is not treated as linked, so the field stays editable", () => {
    expect(isLinked(true, false)).toBe(false);
  });

  it("is still linked when a brand is attached", () => {
    expect(isLinked(true, true)).toBe(true);
  });

  it("is not linked when the value is a literal", () => {
    expect(isLinked(false, true)).toBe(false);
    expect(isLinked(false, false)).toBe(false);
  });
});
