import { render, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { VariableChipBase } from "./VariableChipBase";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function renderChip(onUpdateAttributes = vi.fn(), onDelete = vi.fn()) {
  const store = createStore();
  store.set(availableVariablesAtom, { data: { message: "hi" } });
  const utils = render(
    <Provider store={store}>
      <VariableChipBase
        variableId=""
        isInvalid={false}
        onUpdateAttributes={onUpdateAttributes}
        onDelete={onDelete}
        icon={<span />}
      />
    </Provider>
  );
  // An empty chip opens in edit mode, which is the state `{{` leaves behind.
  const editable = utils.container.querySelector('[contenteditable="true"]') as HTMLElement;
  return { ...utils, editable, onUpdateAttributes, onDelete };
}

/**
 * An open chip's text lives only in its contenteditable until blur — it is not
 * in the ProseMirror doc, so it is dropped by serialization and the
 * document-level `}}` handler cannot see it. Typing `}}` has to close the chip
 * here, or the author cannot commit the expression and loses it on reload.
 */
describe("typing }} inside an open chip", () => {
  it("commits the expression and strips the closing braces", async () => {
    const { editable, onUpdateAttributes } = renderChip();
    expect(editable).toBeTruthy();

    editable.textContent = "truncate data.message 20}}";
    fireEvent.input(editable);

    await waitFor(() => {
      expect(onUpdateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ id: "truncate data.message 20" })
      );
    });
    expect(editable.textContent).not.toContain("}}");
  });

  it("commits a plain variable the same way", async () => {
    const { editable, onUpdateAttributes } = renderChip();

    editable.textContent = "data.message}}";
    fireEvent.input(editable);

    await waitFor(() => {
      expect(onUpdateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ id: "data.message", isInvalid: false })
      );
    });
  });

  it("leaves a chip open while the expression is still being typed", () => {
    const { editable, onUpdateAttributes } = renderChip();

    editable.textContent = "truncate data.message 20";
    fireEvent.input(editable);

    expect(onUpdateAttributes).not.toHaveBeenCalled();
    expect(editable.textContent).toBe("truncate data.message 20");
  });

  it("deletes the chip when only the braces are typed", async () => {
    const { editable, onDelete } = renderChip();

    editable.textContent = "}}";
    fireEvent.input(editable);

    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });
});

/**
 * `{{` typed while a chip is already open leaves the braces in the chip, which
 * then commits a variable named `{{cap` — the author meant to open a chip and
 * was already in one.
 */
describe("braces typed inside an open chip", () => {
  it("drops them, keeping what was typed after", () => {
    const { editable, onUpdateAttributes } = renderChip();

    editable.textContent = " {{cap";
    fireEvent.input(editable);
    expect(editable.textContent).toBe("cap");

    editable.textContent = "capitalize}}";
    fireEvent.input(editable);
    expect(onUpdateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ id: "capitalize" })
    );
  });

  it("leaves a name with no braces alone", () => {
    const { editable } = renderChip();
    editable.textContent = "data.name";
    fireEvent.input(editable);
    expect(editable.textContent).toBe("data.name");
  });
});

/**
 * Typing `{{capitalize "q"}}` folds the chip and the text after it back into
 * one literal expression, which destroys the chip — and the destroyed chip's
 * span then blurred, read empty, and deleted or blanked whatever had taken its
 * place. A node view that is no longer in the document must not write.
 */
describe("a chip whose node view has been removed", () => {
  it("does not commit or delete on a blur that arrives after it is gone", () => {
    const { editable, onUpdateAttributes, onDelete } = renderChip();

    editable.textContent = "capitalize";
    fireEvent.input(editable);
    onUpdateAttributes.mockClear();

    // What the fold does: the node is replaced, so this element is out of the
    // document by the time the blur it caused is dispatched.
    Object.defineProperty(editable, "isConnected", { value: false, configurable: true });
    fireEvent.blur(editable);

    expect(onDelete).not.toHaveBeenCalled();
    expect(onUpdateAttributes).not.toHaveBeenCalled();
  });

  it("still commits a blur while it is in the document", () => {
    const { editable, onUpdateAttributes } = renderChip();

    editable.textContent = "data.message";
    fireEvent.input(editable);
    fireEvent.blur(editable);

    expect(onUpdateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ id: "data.message" })
    );
  });
});

/**
 * Committing on `}}` destroys this node view when the chip becomes an
 * expression chip, so the span can be gone a line later: `.blur()` on it threw
 * `Cannot read properties of null (reading 'blur')` in the sidebar Label, and
 * the caret was left nowhere, so the characters typed next went into the void.
 */
describe("closing a chip with }} leaves the editor usable", () => {
  it("does not touch the span once the commit has taken it away", () => {
    const onUpdateAttributes = vi.fn();
    const { editable } = renderChip(onUpdateAttributes);

    // What the expression swap does: this node view goes away while committing.
    onUpdateAttributes.mockImplementation(() => {
      Object.defineProperty(editable, "isConnected", { value: false, configurable: true });
    });

    editable.textContent = "capitalize data.message}}";
    expect(() => fireEvent.input(editable)).not.toThrow();
  });

  it("asks for the caret to be put back after the chip", () => {
    const onCommit = vi.fn();
    const store = createStore();
    store.set(availableVariablesAtom, { data: { message: "hi" } });
    const { container } = render(
      <Provider store={store}>
        <VariableChipBase
          variableId=""
          isInvalid={false}
          onUpdateAttributes={vi.fn()}
          onDelete={vi.fn()}
          onCommit={onCommit}
          icon={<span />}
        />
      </Provider>
    );
    const editable = container.querySelector('[contenteditable="true"]') as HTMLElement;

    // An expression body is not a valid variable name, so the valid-variable
    // path — the only one that used to restore the caret — never ran, and the
    // author was left typing into nothing.
    editable.textContent = "capitalize data.message}}";
    fireEvent.input(editable);

    expect(onCommit).toHaveBeenCalled();
  });
});

