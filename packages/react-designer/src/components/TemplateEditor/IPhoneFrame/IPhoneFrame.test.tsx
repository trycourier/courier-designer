import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IPhoneFrame } from "./IPhoneFrame";

const screenOf = () => screen.getByText("Content").closest("[data-issue-gutter-edge]")!;

describe("IPhoneFrame", () => {
  it("renders its content on the screen", () => {
    render(<IPhoneFrame>Content</IPhoneFrame>);

    expect(screenOf()).toHaveClass("courier-bg-background");
  });

  // A chat channel draws its background on the screen.
  it("adds a screen class when given one", () => {
    render(<IPhoneFrame screenClassName="courier-chat-screen">Content</IPhoneFrame>);

    expect(screenOf()).toHaveClass("courier-chat-screen", "courier-bg-background");
  });

  // Status icons follow the screen's text colour, so they stay visible in dark mode.
  it("draws the status icons in the current text colour", () => {
    const { container } = render(<IPhoneFrame>Content</IPhoneFrame>);
    const colours = Array.from(container.querySelectorAll("svg [fill], svg [stroke]")).flatMap(
      (el) => ["fill", "stroke"].map((a) => el.getAttribute(a)).filter((v) => v && v !== "none")
    );

    expect(colours.length).toBeGreaterThan(0);
    expect(new Set(colours)).toEqual(new Set(["currentColor"]));
  });
});
