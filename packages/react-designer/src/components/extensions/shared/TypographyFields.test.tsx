import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { useState, type ReactNode } from "react";
import { emailFormattingEnabledAtom } from "@/components/TemplateEditor/store";
import { MAX_FONT_SIZE, MAX_LINE_HEIGHT } from "@/lib/constants/typography-limits";
import { TypographyFields } from "./TypographyFields";

/**
 * The block-level fields behave as an *editable placeholder*: they show the size
 * the block already renders at (document base, then tier preset), keep tracking
 * it, and only write to the block once the author types a different number.
 */
const renderFields = (ui: ReactNode) => {
  const store = createStore();
  store.set(emailFormattingEnabledAtom, true);
  render(<Provider store={store}>{ui}</Provider>);
};

const fontSizeInput = () => screen.getByTestId("typography-font-size") as HTMLInputElement;
const lineHeightInput = () => screen.getByTestId("typography-line-height") as HTMLInputElement;

/**
 * The block as it actually behaves: the override the field commits comes back in
 * as the value, and clearing it drops back to the inherited size. Static props
 * would hide the loop that used to make the field impossible to empty.
 */
const StatefulFields = ({ inheritedFontSize = 13 }: { inheritedFontSize?: number }) => {
  const [fontSize, setFontSize] = useState<number | null>(null);
  return (
    <TypographyFields
      fontSize={fontSize}
      lineHeight={null}
      inheritedFontSize={inheritedFontSize}
      inheritedLineHeight={15}
      onFontSizeChange={setFontSize}
      onLineHeightChange={vi.fn()}
    />
  );
};

describe("TypographyFields", () => {
  it("seeds both fields from the inherited values when the block sets nothing", () => {
    renderFields(
      <TypographyFields
        fontSize={null}
        lineHeight={null}
        inheritedFontSize={13}
        inheritedLineHeight={15}
        onFontSizeChange={vi.fn()}
        onLineHeightChange={vi.fn()}
      />
    );

    expect(fontSizeInput().value).toBe("13");
    expect(lineHeightInput().value).toBe("15");
  });

  it("shows the block's own override in place of the inherited value", () => {
    renderFields(
      <TypographyFields
        fontSize={20}
        lineHeight={24}
        inheritedFontSize={13}
        inheritedLineHeight={15}
        onFontSizeChange={vi.fn()}
        onLineHeightChange={vi.fn()}
      />
    );

    expect(fontSizeInput().value).toBe("20");
    expect(lineHeightInput().value).toBe("24");
  });

  it("follows the document base as it moves, without writing to the block", () => {
    const onFontSizeChange = vi.fn();
    const onLineHeightChange = vi.fn();
    const store = createStore();
    store.set(emailFormattingEnabledAtom, true);

    const fields = (inheritedFontSize: number, inheritedLineHeight: number) => (
      <Provider store={store}>
        <TypographyFields
          fontSize={null}
          lineHeight={null}
          inheritedFontSize={inheritedFontSize}
          inheritedLineHeight={inheritedLineHeight}
          onFontSizeChange={onFontSizeChange}
          onLineHeightChange={onLineHeightChange}
        />
      </Provider>
    );

    const { rerender } = render(fields(13, 15));
    rerender(fields(12, 13));

    expect(fontSizeInput().value).toBe("12");
    expect(lineHeightInput().value).toBe("13");
    expect(onFontSizeChange).not.toHaveBeenCalled();
    expect(onLineHeightChange).not.toHaveBeenCalled();
  });

  it("writes the override once the author types a different number", () => {
    const onFontSizeChange = vi.fn();
    renderFields(
      <TypographyFields
        fontSize={null}
        lineHeight={null}
        inheritedFontSize={13}
        inheritedLineHeight={15}
        onFontSizeChange={onFontSizeChange}
        onLineHeightChange={vi.fn()}
      />
    );

    fireEvent.change(fontSizeInput(), { target: { value: "20" } });
    expect(onFontSizeChange).toHaveBeenCalledWith(20);
  });

  // Typing the number the field was already showing is not a change: persisting
  // it would pin the block so it stopped tracking the document base.
  it("treats the inherited value as unset rather than pinning it", () => {
    const onFontSizeChange = vi.fn();
    renderFields(
      <TypographyFields
        fontSize={20}
        lineHeight={null}
        inheritedFontSize={13}
        inheritedLineHeight={15}
        onFontSizeChange={onFontSizeChange}
        onLineHeightChange={vi.fn()}
      />
    );

    fireEvent.change(fontSizeInput(), { target: { value: "13" } });
    expect(onFontSizeChange).toHaveBeenCalledWith(null);
  });

  it("drops the override when the field is cleared", () => {
    const onLineHeightChange = vi.fn();
    renderFields(
      <TypographyFields
        fontSize={null}
        lineHeight={24}
        inheritedFontSize={13}
        inheritedLineHeight={15}
        onFontSizeChange={vi.fn()}
        onLineHeightChange={onLineHeightChange}
      />
    );

    fireEvent.change(lineHeightInput(), { target: { value: "" } });
    expect(onLineHeightChange).toHaveBeenCalledWith(null);
  });

  it("does not fire for a no-op change on an already-inheriting field", () => {
    const onFontSizeChange = vi.fn();
    renderFields(
      <TypographyFields
        fontSize={null}
        lineHeight={null}
        inheritedFontSize={13}
        inheritedLineHeight={15}
        onFontSizeChange={onFontSizeChange}
        onLineHeightChange={vi.fn()}
      />
    );

    fireEvent.change(fontSizeInput(), { target: { value: "" } });
    fireEvent.change(fontSizeInput(), { target: { value: "13" } });
    expect(onFontSizeChange).not.toHaveBeenCalled();
  });

  // `max` only blocks the spinner and form validation, so a typed or pasted
  // value still has to be capped in the commit path.
  it("caps a typed value at the ceiling instead of dropping it", () => {
    const onFontSizeChange = vi.fn();
    const onLineHeightChange = vi.fn();
    renderFields(
      <TypographyFields
        fontSize={null}
        lineHeight={null}
        inheritedFontSize={13}
        inheritedLineHeight={15}
        onFontSizeChange={onFontSizeChange}
        onLineHeightChange={onLineHeightChange}
      />
    );

    fireEvent.change(fontSizeInput(), { target: { value: "2000" } });
    fireEvent.change(lineHeightInput(), { target: { value: "2000" } });

    expect(onFontSizeChange).toHaveBeenCalledWith(MAX_FONT_SIZE);
    expect(onLineHeightChange).toHaveBeenCalledWith(MAX_LINE_HEIGHT);
    expect(fontSizeInput().max).toBe(String(MAX_FONT_SIZE));
    expect(lineHeightInput().max).toBe(String(MAX_LINE_HEIGHT));
  });

  it("hides the line spacing field for button labels", () => {
    renderFields(
      <TypographyFields
        fontSize={null}
        inheritedFontSize={14}
        showLineHeight={false}
        onFontSizeChange={vi.fn()}
      />
    );

    expect(fontSizeInput().value).toBe("14");
    expect(screen.queryByTestId("typography-line-height")).not.toBeInTheDocument();
  });

  it("can be emptied and retyped below the inherited size", () => {
    renderFields(<StatefulFields />);

    fireEvent.change(fontSizeInput(), { target: { value: "1" } });
    fireEvent.change(fontSizeInput(), { target: { value: "" } });
    expect(fontSizeInput().value).toBe("");

    fireEvent.change(fontSizeInput(), { target: { value: "2" } });
    fireEvent.change(fontSizeInput(), { target: { value: "23" } });
    expect(fontSizeInput().value).toBe("23");

    // Blur can only ever leave a real number behind.
    fireEvent.blur(fontSizeInput());
    expect(fontSizeInput().value).toBe("23");
  });

  it("falls back to the inherited size while the field is empty", () => {
    renderFields(<StatefulFields />);

    fireEvent.change(fontSizeInput(), { target: { value: "20" } });
    fireEvent.change(fontSizeInput(), { target: { value: "" } });
    // The override is gone, so the canvas renders the inherited size again...
    expect(fontSizeInput().value).toBe("");
    // ...and blurring shows that inherited size rather than an empty box.
    fireEvent.blur(fontSizeInput());
    expect(fontSizeInput().value).toBe("13");
  });
});
