import { fireEvent, render, waitFor } from "@testing-library/react";
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

/**
 * Only the focus handler and a commit may clear `autoEdit`. The chip's own
 * validation writes `isInvalid` a few milliseconds after the chip opens, and
 * the node views were adding `autoEdit: false` to every attribute write, so the
 * flag went out before the span had focus and the next keys landed outside the
 * chip: the draft stored `{{d}}ata.name}}X`.
 */
describe("what may clear the flag", () => {
  it("does not clear it when validation marks the name invalid", async () => {
    const onUpdateAttributes = vi.fn();
    HTMLElement.prototype.focus = vi.fn();
    const store = createStore();
    store.set(availableVariablesAtom, { data: { message: "hi" } });

    render(
      <Provider store={store}>
        <VariableChipBase
          variableId="not.a.known.variable"
          isInvalid={false}
          onUpdateAttributes={onUpdateAttributes}
          onDelete={vi.fn()}
          icon={<span />}
          autoEdit
          onAutoEditConsumed={vi.fn()}
        />
      </Provider>
    );

    await waitFor(() => expect(onUpdateAttributes).toHaveBeenCalled());
    for (const [attrs] of onUpdateAttributes.mock.calls) {
      expect(attrs, "validation must not touch autoEdit").not.toHaveProperty("autoEdit");
    }
  });

  it("clears it when the chip commits", () => {
    HTMLElement.prototype.focus = vi.fn();
    const onUpdateAttributes = vi.fn();
    const store = createStore();
    store.set(availableVariablesAtom, { data: { message: "hi" } });
    const { container } = render(
      <Provider store={store}>
        <VariableChipBase
          variableId=""
          isInvalid={false}
          onUpdateAttributes={onUpdateAttributes}
          onDelete={vi.fn()}
          icon={<span />}
          autoEdit
          onAutoEditConsumed={vi.fn()}
        />
      </Provider>
    );

    const editable = container.querySelector('[contenteditable="true"]') as HTMLElement;
    editable.textContent = "data.message";
    fireEvent.blur(editable);

    expect(onUpdateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ id: "data.message", autoEdit: false })
    );
  });
});

/**
 * The deferred caret placement checked only that its element was still in the
 * document. A chip that has committed leaves a span that is still attached but
 * no longer editable, and putting the caret there left typing doing nothing —
 * the browser sends no `beforeinput` for a caret inside `contenteditable=false`.
 */
describe("the deferred caret placement", () => {
  it("does nothing once the chip has a different span", async () => {
    const frames: Array<() => void> = [];
    const realRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      frames.push(() => cb(0));
      return 1;
    }) as typeof globalThis.requestAnimationFrame;

    try {
      const { editable } = renderChip();
      const span = editable();
      // What a commit does: this span stops being the chip's editable one.
      span.setAttribute("contenteditable", "false");

      const selection = window.getSelection();
      selection?.removeAllRanges();
      frames.forEach((run) => run());

      expect(selection?.rangeCount ?? 0).toBe(0);
    } finally {
      globalThis.requestAnimationFrame = realRaf;
    }
  });
});
