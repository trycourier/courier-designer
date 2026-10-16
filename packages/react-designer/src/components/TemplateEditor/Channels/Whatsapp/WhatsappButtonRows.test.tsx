import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { pendingAutoSaveAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import type { ElementalActionNode, ElementalContent, ElementalNode } from "@/types/elemental.types";
import { selectedWhatsappButtonAtom } from "./store";
import { WhatsappButtonRows } from "./WhatsappButtonRows";

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  dropTargetForElements: vi.fn(() => () => {}),
  monitorForElements: vi.fn(() => () => {}),
}));

const track: ElementalActionNode = {
  type: "action",
  content: "Track",
  href: "https://example.com/t",
};
const help: ElementalActionNode = {
  type: "action",
  content: "Help",
  href: "https://example.com/h",
};

const whatsapp = (...elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "whatsapp", elements }],
});

const savedActions = (store: ReturnType<typeof createStore>) =>
  (
    (store.get(pendingAutoSaveAtom) as ElementalContent).elements[0] as {
      elements: ElementalNode[];
    }
  ).elements.filter((el) => el.type === "action");

describe("WhatsappButtonRows", () => {
  let store: ReturnType<typeof createStore>;

  const mount = (actions: ElementalActionNode[], editable = true) =>
    render(
      <Provider store={store}>
        <WhatsappButtonRows actions={actions} editable={editable} />
      </Provider>
    );

  beforeEach(() => {
    store = createStore();
    store.set(pendingAutoSaveAtom, null);
    store.set(selectedWhatsappButtonAtom, null);
  });

  it("draws one row per button, with a placeholder for an empty label", () => {
    mount([track, { type: "action", content: "", href: "" }]);

    expect(screen.getByText("Track")).toBeInTheDocument();
    expect(screen.getByText("Button")).toBeInTheDocument();
  });

  it("selects a clicked row and shows its actions", () => {
    mount([track, help]);

    fireEvent.click(screen.getByText("Help"));

    expect(store.get(selectedWhatsappButtonAtom)).toBe(1);
    expect(screen.getByRole("button", { name: "Delete button" })).toBeInTheDocument();
  });

  it("does not select a row while read-only", () => {
    mount([track], false);

    fireEvent.click(screen.getByText("Track"));

    expect(store.get(selectedWhatsappButtonAtom)).toBeNull();
  });

  it("duplicates a button next to itself and selects the copy", () => {
    store.set(templateEditorContentAtom, whatsapp(track));
    store.set(selectedWhatsappButtonAtom, 0);
    mount([track]);

    fireEvent.click(screen.getByRole("button", { name: "Duplicate button" }));

    expect(savedActions(store)).toEqual([track, track]);
    expect(store.get(selectedWhatsappButtonAtom)).toBe(1);
  });

  // Meta allows two URL buttons per template.
  it("cannot duplicate once there are two buttons", () => {
    store.set(selectedWhatsappButtonAtom, 0);
    mount([track, help]);

    expect(screen.getByRole("button", { name: "Duplicate button" })).toBeDisabled();
  });

  it("deletes a button and clears the selection", () => {
    store.set(templateEditorContentAtom, whatsapp(track, help));
    store.set(selectedWhatsappButtonAtom, 0);
    mount([track, help]);

    fireEvent.click(screen.getByRole("button", { name: "Delete button" }));

    expect(savedActions(store)).toEqual([help]);
    expect(store.get(selectedWhatsappButtonAtom)).toBeNull();
  });
});
