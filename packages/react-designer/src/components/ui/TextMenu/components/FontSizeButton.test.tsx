import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { emailFormattingEnabledAtom } from "@/components/TemplateEditor/store";
import { MAX_FONT_SIZE } from "@/lib/constants/typography-limits";
import { FontSizeButton } from "./FontSizeButton";

/**
 * The per-run size control behaves as an editable placeholder, like the
 * block-level fields: it shows what the selection already renders at and only
 * writes a `font_size` mark once the author types a different number.
 */
const renderButton = (ui: ReactNode) => {
  const store = createStore();
  store.set(emailFormattingEnabledAtom, true);
  render(<Provider store={store}>{ui}</Provider>);
};

const openPopover = () => fireEvent.click(screen.getByTestId("text-menu-font-size"));
const sizeInput = () => screen.getByLabelText("Text size") as HTMLInputElement;

describe("FontSizeButton", () => {
  it("shows the inherited size on the trigger when the run sets nothing", () => {
    renderButton(<FontSizeButton inheritedFontSize={13} onChange={vi.fn()} />);

    expect(screen.getByTestId("text-menu-font-size")).toHaveTextContent("13");
  });

  it("shows the run's own size in place of the inherited one", () => {
    renderButton(<FontSizeButton fontSize={20} inheritedFontSize={13} onChange={vi.fn()} />);

    expect(screen.getByTestId("text-menu-font-size")).toHaveTextContent("20");
  });

  it("seeds the input with the inherited size", () => {
    renderButton(<FontSizeButton inheritedFontSize={13} onChange={vi.fn()} />);

    openPopover();
    expect(sizeInput().value).toBe("13");
  });

  it("writes the mark once the author commits a different size", () => {
    const onChange = vi.fn();
    renderButton(<FontSizeButton inheritedFontSize={13} onChange={onChange} />);

    openPopover();
    fireEvent.change(sizeInput(), { target: { value: "20" } });
    fireEvent.blur(sizeInput());

    expect(onChange).toHaveBeenCalledWith(20);
  });

  // Opening and dismissing the popover must not push a transaction — that would
  // pin the run at its inherited size and steal the caret.
  it("does not write anything when the seeded value is committed unchanged", () => {
    const onChange = vi.fn();
    renderButton(<FontSizeButton inheritedFontSize={13} onChange={onChange} />);

    openPopover();
    fireEvent.blur(sizeInput());

    expect(onChange).not.toHaveBeenCalled();
  });

  it("drops the mark when the author retypes the inherited size", () => {
    const onChange = vi.fn();
    renderButton(<FontSizeButton fontSize={20} inheritedFontSize={13} onChange={onChange} />);

    openPopover();
    fireEvent.change(sizeInput(), { target: { value: "13" } });
    fireEvent.blur(sizeInput());

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("drops the mark when the field is cleared", () => {
    const onChange = vi.fn();
    renderButton(<FontSizeButton fontSize={20} inheritedFontSize={13} onChange={onChange} />);

    openPopover();
    fireEvent.change(sizeInput(), { target: { value: "" } });
    fireEvent.blur(sizeInput());

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("caps a typed value at the ceiling", () => {
    const onChange = vi.fn();
    renderButton(<FontSizeButton inheritedFontSize={13} onChange={onChange} />);

    openPopover();
    fireEvent.change(sizeInput(), { target: { value: "2000" } });
    fireEvent.blur(sizeInput());

    expect(onChange).toHaveBeenCalledWith(MAX_FONT_SIZE);
    expect(sizeInput().max).toBe(String(MAX_FONT_SIZE));
  });
});
