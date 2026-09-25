import { render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { chipHousekeeping } from "@/components/extensions/chipEditing";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/**
 * Undo right after typing a chip stepped back to the moment the chip existed
 * but had no name yet. The chip opened itself, took focus and put an unfiltered
 * variable list on screen; Escape then deleted it as a history step, which
 * wiped the redo stack so Cmd+Shift+Z did nothing.
 *
 * Neither the flag that opens a chip nor the removal of an abandoned one is
 * something the author did, so neither belongs in the history.
 */
describe("chipHousekeeping", () => {
  function fakeEditor() {
    const metas: Array<[string, unknown]> = [];
    const tr = {
      setNodeMarkup: () => tr,
      delete: () => tr,
      setMeta: (key: string, value: unknown) => {
        metas.push([key, value]);
        return tr;
      },
    };
    const editor = {
      state: {
        tr,
        doc: { nodeAt: () => ({ type: { name: "variable" }, attrs: {}, nodeSize: 1 }) },
      },
      view: { dispatch: () => undefined },
      isDestroyed: false,
    } as never;
    return { editor, metas };
  }

  it("keeps an abandoned chip's removal out of the history", () => {
    const { editor, metas } = fakeEditor();
    chipHousekeeping.removeChip({ editor, pos: 3, nodeSize: 1 });
    expect(metas).toContainEqual(["addToHistory", false]);
  });

  it("keeps the open-for-editing flag out of the history", () => {
    const { editor, metas } = fakeEditor();
    chipHousekeeping.setAutoEdit({ editor, pos: 3, value: false });
    expect(metas).toContainEqual(["addToHistory", false]);
  });
});

/**
 * With the flag out of the history, a chip an undo brings back carries
 * `autoEdit: false` — and an empty chip only opens itself when something asked
 * it to.
 */
describe("an empty chip that nobody asked to open", () => {
  const renderChip = (autoEdit: boolean) => {
    const store = createStore();
    store.set(availableVariablesAtom, { data: { message: "hi" } });
    return render(
      <Provider store={store}>
        <VariableChipBase
          variableId=""
          isInvalid={false}
          onUpdateAttributes={vi.fn()}
          onDelete={vi.fn()}
          icon={<span />}
          autoEdit={autoEdit}
          onAutoEditConsumed={vi.fn()}
        />
      </Provider>
    );
  };

  it("stays closed", () => {
    const { container } = renderChip(false);
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it("still opens when it was just created", () => {
    const { container } = renderChip(true);
    expect(container.querySelector('[contenteditable="true"]')).toBeTruthy();
  });
});
