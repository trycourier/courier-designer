import { render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function renderChip() {
  const store = createStore();
  store.set(availableVariablesAtom, { data: { message: "hi" } });
  const utils = render(
    <Provider store={store}>
      <VariableChipBase
        variableId=""
      autoEdit
        autoEdit
        isInvalid={false}
        onUpdateAttributes={vi.fn()}
        onDelete={vi.fn()}
        icon={<span />}
      />
    </Provider>
  );
  const editable = utils.container.querySelector('[contenteditable="true"]') as HTMLElement;
  return { ...utils, editable };
}

/**
 * Cmd+A inside a chip selected the whole email, and the next keystroke replaced
 * the body. React's `stopPropagation` cannot prevent that: ProseMirror listens
 * natively on the editor element, which sees the event before React's delegated
 * handler at the root ever runs.
 */
describe("select-all inside a chip", () => {
  it("selects the chip's own text and never reaches the editor", () => {
    const { editable, container } = renderChip();
    editable.textContent = "data.message";

    const ancestor = vi.fn();
    container.addEventListener("keydown", ancestor);

    const event = new KeyboardEvent("keydown", {
      key: "a",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    editable.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(ancestor).not.toHaveBeenCalled();
    const selection = window.getSelection();
    expect(selection?.toString()).toBe("data.message");
  });

  it("does the same for Ctrl+A", () => {
    const { editable, container } = renderChip();
    editable.textContent = "data.message";
    const ancestor = vi.fn();
    container.addEventListener("keydown", ancestor);

    editable.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true, cancelable: true })
    );
    expect(ancestor).not.toHaveBeenCalled();
  });

  it("leaves other keys alone", () => {
    const { editable, container } = renderChip();
    const ancestor = vi.fn();
    container.addEventListener("keydown", ancestor);

    editable.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", metaKey: true, bubbles: true, cancelable: true })
    );
    expect(ancestor).toHaveBeenCalled();
  });
});
