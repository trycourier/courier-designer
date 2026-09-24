import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { SignatureHint } from "./SignatureHint";

const signature = { params: [{ name: "string" }], summary: "Capitalise it." };

function anchorAt(top: number, bottom: number) {
  const element = document.createElement("span");
  element.getBoundingClientRect = () =>
    ({ top, bottom, left: 40, right: 80, width: 40, height: bottom - top }) as DOMRect;
  return { current: element };
}

/**
 * The hint sat on the line being edited and covered the chip being typed in,
 * because a chip near the top of the viewport clamped its position into the
 * line instead of moving out of the way.
 */
describe("where the signature hint sits", () => {
  it("sits clear above the chip when there is room, whatever its own height", () => {
    const { container } = render(
      <SignatureHint name="capitalize" signature={signature} activeParam={0} anchorRef={anchorAt(300, 320)} />
    );
    const hint = container.firstElementChild as HTMLElement;
    // Its bottom edge is pinned to just above the chip, so a taller hint grows
    // upwards instead of down over the chip — which is what the fixed 30px
    // offset did, leaving the hint across the line being typed in.
    expect(parseFloat(hint.style.top)).toBe(294);
    expect(hint.style.transform).toContain("translateY(-100%)");
  });

  it("drops below the chip rather than covering it when there is no room above", () => {
    const { container } = render(
      <SignatureHint name="capitalize" signature={signature} activeParam={0} anchorRef={anchorAt(8, 28)} />
    );
    const hint = container.firstElementChild as HTMLElement;
    expect(parseFloat(hint.style.top)).toBe(34);
    expect(hint.style.transform).not.toContain("translateY(-100%)");
  });
});
