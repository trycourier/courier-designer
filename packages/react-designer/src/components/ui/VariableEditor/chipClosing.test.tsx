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
