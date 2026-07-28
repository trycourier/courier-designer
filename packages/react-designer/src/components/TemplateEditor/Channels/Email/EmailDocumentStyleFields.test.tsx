import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmailBodyFrame } from "./EmailDocumentStyleFields";

describe("EmailBodyFrame", () => {
  const renderFrame = (emailPaddingVertical: number, emailPaddingHorizontal: number) => {
    render(
      <EmailBodyFrame documentStyles={{ emailPaddingVertical, emailPaddingHorizontal }}>
        <div>content</div>
      </EmailBodyFrame>
    );
    return screen.getByTestId("email-body-frame");
  };

  it("applies the resolved inset as vertical/horizontal padding", () => {
    const frame = renderFrame(24, 30);

    expect(frame.style.padding).toBe("24px 30px");
  });

  it("renders a zero inset rather than falling back to a default", () => {
    const frame = renderFrame(0, 0);

    expect(frame.style.padding).toBe("0px 0px");
  });

  it("zeroes the editor's own vertical padding so the frame is the only inset", () => {
    // `.ProseMirror` carries a global courier-py-10 that predates document-level
    // padding. Without this override the frame's value is added to that 40px, so
    // a 20px Frame previews as 60px and 0 previews as more space than 20px did.
    const frame = renderFrame(20, 30);

    expect(frame.className).toContain("[&_.ProseMirror]:courier-py-0");
  });
});
