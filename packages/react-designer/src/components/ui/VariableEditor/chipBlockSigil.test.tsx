import { startsBlockExpression } from "@/components/extensions/HandlebarsExpression/convertVariableChip";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { fireEvent, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/**
 * Typing `{{` opens a variable chip that focuses its own span a frame later, so
 * whether the `#` of `{{#if x}}` reaches the DOCUMENT or the CHIP is a race the
 * author cannot see. `handlebarsEscape` covers the document side; this is the
 * chip's — and at human typing speed the chip's is the side that runs, since a
 * pause after `{{` is all it takes for the span to have focus.
 */
function renderChip(onBlockExpression = vi.fn(() => true)) {
  const store = createStore();
  store.set(availableVariablesAtom, { data: { name: "Geraldo" } });
  const utils = render(
    <Provider store={store}>
      <VariableChipBase
        variableId=""
        autoEdit
        isInvalid={false}
        onUpdateAttributes={vi.fn()}
        onDelete={vi.fn()}
        onBlockExpression={onBlockExpression}
        icon={<span />}
      />
    </Provider>
  );
  const editable = utils.container.querySelector('[contenteditable="true"]') as HTMLElement;
  return { ...utils, editable, onBlockExpression };
}

const type = (el: HTMLElement, text: string) => {
  el.textContent = text;
  fireEvent.input(el);
};

describe("a block sigil typed into an open variable chip", () => {
  it("hands the chip over to an expression", () => {
    const { editable, onBlockExpression } = renderChip();
    type(editable, "#if data.x");
    expect(onBlockExpression).toHaveBeenCalledWith("#if data.x");
  });

  it("hands over for a closer", () => {
    const { editable, onBlockExpression } = renderChip();
    type(editable, "/if");
    expect(onBlockExpression).toHaveBeenCalledWith("/if");
  });

  it("hands over for an inverse section", () => {
    const { editable, onBlockExpression } = renderChip();
    type(editable, "^unless data.x");
    expect(onBlockExpression).toHaveBeenCalledWith("^unless data.x");
  });

  it("leaves a plain path alone", () => {
    const { editable, onBlockExpression } = renderChip();
    type(editable, "data.name");
    expect(onBlockExpression).not.toHaveBeenCalled();
  });

  it("carries on as a variable when the swap cannot be made", () => {
    const declined = vi.fn(() => false);
    const { editable } = renderChip(declined);
    type(editable, "#if data.x");
    expect(declined).toHaveBeenCalled();
    // Nothing lost by the refusal: the text is still the chip's.
    expect(editable.textContent).toBe("#if data.x");
  });
});

describe("which texts count as a block expression", () => {
  it("is the sigils the document-level rule uses", () => {
    for (const text of ["#if x", "/if", "^unless x", "  #each items"]) {
      expect(startsBlockExpression(text), text).toBe(true);
    }
    // `else` has no sigil: the document-level rule leaves it as literal text,
    // and a chip holding it serializes to the same `{{else}}`, so converting it
    // mid-typing would gain nothing.
    for (const text of ["data.name", "else", "capitalize data.x", ""]) {
      expect(startsBlockExpression(text), text).toBe(false);
    }
  });
});
