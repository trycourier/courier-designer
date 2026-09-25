import { render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { availableVariablesAtom, variableValidationAtom } from "@/components/TemplateEditor/store";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function renderChip(variableId: string, validation?: Record<string, unknown>) {
  const store = createStore();
  store.set(availableVariablesAtom, { data: { name: "Ada" } });
  if (validation) store.set(variableValidationAtom, validation as never);

  const utils = render(
    <Provider store={store}>
      <VariableChipBase
        variableId={variableId}
        isInvalid
        onUpdateAttributes={vi.fn()}
        onDelete={vi.fn()}
        icon={<span />}
      />
    </Provider>
  );
  const chip = utils.container.querySelector(".courier-variable-chip") as HTMLElement;
  return { ...utils, chip };
}

/**
 * A name the host does not publish renders as an empty string; it does not stop
 * the send. The issues list called it a warning while every chip was drawn red,
 * so the author could not tell it apart from an unclosed block.
 */
describe("a name the host rejects", () => {
  it("is amber, not red", () => {
    const { chip } = renderChip("user.name");
    expect(chip.className).toContain("courier-variable-chip-warning");
    expect(chip.className).not.toContain("courier-variable-chip-invalid");
  });
});

/**
 * The chip and the issues list are describing the same problem, so a host that
 * words it once should see that wording in both places. Without this the chip
 * said nothing at all for `{{user.name}}` and `{{data.}}`.
 */
describe("what an invalid chip says", () => {
  it("uses the host's own wording when it has one", () => {
    const describeInvalid = (name: string) =>
      `"${name}" must start with profile., data., tenant., or $.item.`;
    const { chip } = renderChip("user.name", { describeInvalid });

    expect(chip.getAttribute("title")).toBe(describeInvalid("user.name"));
  });

  it("says something for an incomplete path even with no host wording", () => {
    const { chip } = renderChip("data.");
    expect(chip.getAttribute("title")).toBeTruthy();
  });

  it("leaves a valid chip's own tooltip alone", () => {
    const store = createStore();
    store.set(availableVariablesAtom, { data: { name: "Ada" } });
    const { container } = render(
      <Provider store={store}>
        <VariableChipBase
          variableId="data.name"
          isInvalid={false}
          onUpdateAttributes={vi.fn()}
          onDelete={vi.fn()}
          icon={<span />}
        />
      </Provider>
    );
    const chip = container.querySelector(".courier-variable-chip") as HTMLElement;
    expect(chip.className).not.toContain("courier-variable-chip-warning");
  });
});
