import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormWarning } from "./Form";
import React from "react";

describe("FormWarning", () => {
  it("should render children when provided", () => {
    render(<FormWarning>Some warning message</FormWarning>);
    expect(screen.getByText("Some warning message")).toBeInTheDocument();
  });

  it("should return null when children is empty", () => {
    const { container } = render(<FormWarning>{null}</FormWarning>);
    expect(container.innerHTML).toBe("");
  });

  it("should return null when no children are provided", () => {
    const { container } = render(<FormWarning />);
    expect(container.innerHTML).toBe("");
  });

  it("should render as a <p> element", () => {
    render(<FormWarning>Warning</FormWarning>);
    const el = screen.getByText("Warning");
    expect(el.tagName).toBe("P");
  });

  it("should include the amber warning color class", () => {
    render(<FormWarning>Warning</FormWarning>);
    const el = screen.getByText("Warning");
    expect(el.className).toContain("courier-text-[#92400e]");
  });

  it("should apply additional classNames", () => {
    render(<FormWarning className="courier-my-4">Warning</FormWarning>);
    const el = screen.getByText("Warning");
    expect(el.className).toContain("courier-my-4");
  });

  it("should forward ref", () => {
    const ref = React.createRef<HTMLParagraphElement>();
    render(<FormWarning ref={ref}>Warning</FormWarning>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    expect(ref.current?.textContent).toBe("Warning");
  });

  it("should pass through additional HTML attributes", () => {
    render(<FormWarning data-testid="warning-el">Warning</FormWarning>);
    expect(screen.getByTestId("warning-el")).toBeInTheDocument();
  });

  it("should render complex children (JSX)", () => {
    render(
      <FormWarning>
        <span data-testid="icon">!</span>
        Watch out
      </FormWarning>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Watch out")).toBeInTheDocument();
  });
});
