import { availableVariablesAtom } from "@/components/TemplateEditor/store";
import { render, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function renderChip(props: Partial<React.ComponentProps<typeof VariableChipBase>>) {
  const store = createStore();
  store.set(availableVariablesAtom, { data: { message: "hi" } });
  return render(
    <Provider store={store}>
      <VariableChipBase
        variableId="data.message"
        isInvalid={false}
        onUpdateAttributes={vi.fn()}
        onDelete={vi.fn()}
        icon={<span />}
        {...props}
      />
    </Provider>
  );
}

/**
 * Enter on a selected chip opens it, on the variable chip as on the expression
 * chip. The node sets `autoEdit`; this is the half that acts on it.
 */
describe("autoEdit on a variable chip", () => {
  it("stays closed without the flag", () => {
    const { container } = renderChip({});
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it("opens for editing and reports the flag consumed", async () => {
    const onAutoEditConsumed = vi.fn();
    const { container } = renderChip({ autoEdit: true, onAutoEditConsumed });

    await waitFor(() => {
      expect(container.querySelector('[contenteditable="true"]')).toBeTruthy();
    });
    expect(onAutoEditConsumed).toHaveBeenCalledTimes(1);
  });

  it("seeds the query with the current name, so the author edits rather than retypes", async () => {
    const { container } = renderChip({ autoEdit: true, onAutoEditConsumed: vi.fn() });

    await waitFor(() => {
      const editable = container.querySelector('[contenteditable="true"]') as HTMLElement;
      expect(editable.textContent).toBe("data.message");
    });
  });
});
