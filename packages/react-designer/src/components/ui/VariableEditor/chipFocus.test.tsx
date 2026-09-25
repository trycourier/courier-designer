import { render, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const realFocus = HTMLElement.prototype.focus;
afterEach(() => {
  HTMLElement.prototype.focus = realFocus;
});

function renderChip({ swallowFocus = false } = {}) {
  if (swallowFocus) HTMLElement.prototype.focus = vi.fn();
  const onAutoEditConsumed = vi.fn();
  const store = createStore();
  store.set(availableVariablesAtom, { data: { message: "hi" } });
  const utils = render(
    <Provider store={store}>
      <VariableChipBase
        variableId=""
        isInvalid={false}
        onUpdateAttributes={vi.fn()}
        onDelete={vi.fn()}
        icon={<span />}
        autoEdit
        onAutoEditConsumed={onAutoEditConsumed}
      />
    </Provider>
  );
  const editable = () => utils.container.querySelector('[contenteditable="true"]') as HTMLElement;
  return { ...utils, editable, onAutoEditConsumed };
}

/**
 * A chip opened by `{{` takes focus a render later. Until it does, the
 * characters the author keeps typing reach the document, and `autoEdit` is what
 * marks the chip as still waiting for them — cleared as soon as the chip
 * opened, the keys typed in between were dropped outside it on a large
 * document, where that gap is longest.
 */
describe("a chip waiting for its focus", () => {
  it("keeps the flag until its span actually has focus", () => {
    const { onAutoEditConsumed } = renderChip({ swallowFocus: true });
    expect(onAutoEditConsumed).not.toHaveBeenCalled();
  });

  it("clears the flag once focus lands", () => {
    const { editable, onAutoEditConsumed } = renderChip({ swallowFocus: true });
    fireEvent.focus(editable());
    expect(onAutoEditConsumed).toHaveBeenCalled();
  });

  it("focuses the span itself when it opens", () => {
    const { editable } = renderChip();
    expect(document.activeElement).toBe(editable());
  });
});
