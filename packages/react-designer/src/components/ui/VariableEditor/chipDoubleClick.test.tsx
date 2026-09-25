import { fireEvent, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function renderChip(variableId: string) {
  const onUpdateAttributes = vi.fn();
  const store = createStore();
  store.set(availableVariablesAtom, {
    data: { name: "Ada" },
    profile: { address: { city: "Lisbon" } },
  });
  const utils = render(
    <Provider store={store}>
      <VariableChipBase
        variableId={variableId}
        isInvalid={false}
        onUpdateAttributes={onUpdateAttributes}
        onDelete={vi.fn()}
        icon={<span />}
      />
    </Provider>
  );
  const chip = utils.container.querySelector("[data-variable-chip], span") as HTMLElement;
  return { ...utils, chip, onUpdateAttributes };
}

/**
 * Double-click opened the chip without telling the autocomplete what was in it,
 * so the list showed every variable with the first one highlighted — and Enter,
 * which commits the highlighted row, replaced `{{data.name}}` with whatever
 * happened to sort first. Opening with Enter seeded the query and was fine.
 */
describe("double-clicking a chip to edit it", () => {
  it("leaves the name alone when Enter follows immediately", () => {
    // A name that does not sort first, so committing the highlighted row of an
    // unfiltered list would visibly change it.
    const { container, onUpdateAttributes } = renderChip("profile.address.city");

    fireEvent.doubleClick(container.querySelector("span") as HTMLElement);
    const editable = container.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editable).toBeTruthy();
    fireEvent.keyDown(editable, { key: "Enter" });

    for (const [attrs] of onUpdateAttributes.mock.calls) {
      expect(attrs.id).toBe("profile.address.city");
    }
  });

  it("opens with the chip's own name as the query, like Enter does", () => {
    const { container } = renderChip("data.name");

    fireEvent.doubleClick(container.querySelector("span") as HTMLElement);
    const editable = container.querySelector('[contenteditable="true"]') as HTMLElement;

    // The list is filtered to the name it holds, so the highlighted row is that
    // name and not an unrelated first entry.
    const options = [...document.querySelectorAll("button")].map((b) => b.textContent);
    expect(editable.textContent).toBe("data.name");
    expect(options).not.toContain("profile.address.city");
  });
});
