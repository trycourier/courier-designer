import { availableVariablesAtom, variableValidationAtom } from "@/components/TemplateEditor/store";
import { collectTemplateIssues } from "@/lib/utils/handlebars/templateIssues";
import { render, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { VariableChipBase } from "./VariableChipBase";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/** Studio's rule: a known prefix plus a field. */
const hostValidate = (name: string) =>
  ["profile.", "data.", "tenant."].some((p) => name.startsWith(p) && name.length > p.length);

function renderChip(variableId: string, onUpdateAttributes = vi.fn()) {
  const store = createStore();
  store.set(availableVariablesAtom, { data: { name: "x" } });
  store.set(variableValidationAtom, { validate: hostValidate, onInvalid: "mark" } as never);
  render(
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
  return onUpdateAttributes;
}

describe("a chip loaded from stored content", () => {
  it("is re-validated against the host validator on mount", async () => {
    // Studio lists `{{user.name}}` as rejected; the chip has to agree, or the
    // author sees a clean chip beside a complaint about it.
    const onUpdateAttributes = renderChip("user.name");
    await waitFor(() => {
      expect(onUpdateAttributes).toHaveBeenCalledWith({ id: "user.name", isInvalid: true });
    });
  });

  it("leaves a path the host accepts alone", async () => {
    const onUpdateAttributes = renderChip("data.name");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onUpdateAttributes).not.toHaveBeenCalledWith(
      expect.objectContaining({ isInvalid: true })
    );
  });
});

describe("a host rejection is not a blocking issue", () => {
  it("never reaches collectTemplateIssues, so a send is not gated on it", () => {
    // Geraldo's decision: a rejected variable is a warning in Studio's list,
    // not a block. The validator only judges syntax, so there is nothing here
    // that could turn one into a blocking entry.
    const content: unknown = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [{ type: "text", content: "Hi {{user.name}} and {{nope.field}}" }],
        },
      ],
    };
    expect(collectTemplateIssues(content as never)).toEqual([]);
  });
});
