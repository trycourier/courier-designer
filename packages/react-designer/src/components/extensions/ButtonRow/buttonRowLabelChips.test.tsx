import { availableVariablesAtom, variableValidationAtom } from "@/components/TemplateEditor/store";
import { render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { ButtonRowComponent } from "./ButtonRowComponent";

vi.mock("../../ui/SortableItemWrapper", () => ({
  SortableItemWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * A row's labels live in attributes, so the row draws them itself rather than
 * through the chip node views. It used to split them on its own
 * `{{([^}]+)}}` regex: handlebars came out as raw text beside the chips, and
 * the variable pills it did draw were never put to the host's validator — the
 * same `{{test}}` drew purple here and amber in the sidebar.
 */
function renderRow(label: string, options: { available?: Record<string, unknown> } = {}) {
  const store = createStore();
  store.set(availableVariablesAtom, options.available ?? { data: { name: "Geraldo" } });
  store.set(variableValidationAtom, undefined as never);

  const utils = render(
    <Provider store={store}>
      <ButtonRowComponent
        button1Label={label}
        button1Link=""
        button2Label="Button 2"
        button2Link=""
        padding={6}
        editable
        onButton1LabelChange={vi.fn()}
        onButton2LabelChange={vi.fn()}
      />
    </Provider>
  );
  return {
    ...utils,
    variableChips: () => Array.from(utils.container.querySelectorAll(".courier-variable-chip")),
    expressionChips: () => Array.from(utils.container.querySelectorAll(".courier-handlebars-chip")),
  };
}

describe("a variable in a button row's label", () => {
  it("gets the warning the sidebar gives it, for a name the host does not have", () => {
    const { variableChips } = renderRow("My label {{test}}");

    expect(variableChips()).toHaveLength(1);
    expect(variableChips()[0].className).toContain("courier-variable-chip-warning");
  });

  it("stays a plain chip for a name that is there", () => {
    const { variableChips } = renderRow("Hi {{data.name}}");

    expect(variableChips()).toHaveLength(1);
    expect(variableChips()[0].className).not.toContain("courier-variable-chip-warning");
  });

  it("is judged in the scope its own label opens", () => {
    // `item` resolves inside the each, so it is not the host's to reject.
    const { variableChips } = renderRow("{{#each data.list}}{{item}}{{/each}}");

    expect(variableChips()[0].className).not.toContain("courier-variable-chip-warning");
  });
});

describe("handlebars in a button row's label", () => {
  it("draws as an expression chip, not as raw braces", () => {
    const { expressionChips, container } = renderRow("Geraldo {{#if x}}");

    expect(expressionChips()).toHaveLength(1);
    expect(expressionChips()[0].dataset.handlebarsKind).toBe("blockOpen");
    expect(container.textContent).not.toContain("{{");
  });

  it("marks one the send cannot compile", () => {
    const { expressionChips } = renderRow("Geraldo {{#f x}}");

    expect(expressionChips()[0].className).toContain("courier-handlebars-chip-invalid");
  });

  it("switches the row out of raw-text mode even with no variable in the label", () => {
    const { expressionChips } = renderRow("{{#if data.x}}");

    // The label that holds the chip is not in edit mode; the other button's is.
    expect(expressionChips()[0].closest("[contenteditable]")?.getAttribute("contenteditable")).toBe(
      "false"
    );
  });
});
