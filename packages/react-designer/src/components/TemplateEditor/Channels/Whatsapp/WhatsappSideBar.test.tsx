import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import {
  pendingAutoSaveAtom,
  templateEditorAtom,
  templateEditorContentAtom,
} from "@/components/TemplateEditor/store";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { selectedWhatsappButtonAtom } from "./store";
import { WhatsappSideBar } from "./WhatsappSideBar";

vi.mock("../Slack/SideBar", () => ({
  SlackSideBarItemDetails: ({ defaultElement }: { defaultElement: React.ReactNode }) => (
    <div data-testid="details">{defaultElement}</div>
  ),
}));

vi.mock("@/components/ui/FormHeader", () => ({
  FormHeader: () => <div data-testid="form-header" />,
}));

vi.mock("@/components/ui/VariableEditor", () => ({
  VariableInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Label" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  VariableTextarea: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Link" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const IMAGE = "https://cdn.example.com/order.jpg";
const body: ElementalNode = { type: "text", content: "Body" };

const whatsapp = (...elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "whatsapp", elements }],
});

const savedElements = (store: ReturnType<typeof createStore>) =>
  (
    (store.get(pendingAutoSaveAtom) as ElementalContent).elements[0] as {
      elements: ElementalNode[];
    }
  ).elements;

// Radix tabs switch on mouse down
const pick = (name: string) =>
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

describe("WhatsappSideBar", () => {
  let store: ReturnType<typeof createStore>;

  const mount = () =>
    render(
      <Provider store={store}>
        <WhatsappSideBar />
      </Provider>
    );

  beforeEach(() => {
    store = createStore();
    store.set(pendingAutoSaveAtom, null);
    store.set(selectedWhatsappButtonAtom, null);
  });

  describe("the header type", () => {
    it("shows Text for a text header", () => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", title: "Hi" }, body));
      mount();

      expect(screen.getByRole("tab", { name: "Text" })).toHaveAttribute("data-state", "active");
      expect(screen.queryByRole("button", { name: "Remove image" })).toBeNull();
    });

    it("shows Image for an image header, before or after an upload", () => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", image: "" }, body));
      mount();

      expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("data-state", "active");
    });

    it("Text → Image saves a blank image and removes the title", () => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", title: "Hi" }, body));
      mount();

      pick("Image");

      expect(savedElements(store)[0]).toEqual({ type: "meta", image: "" });
      expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("data-state", "active");
    });

    // The header line is hidden, not cleared, while Image is picked.
    it("Image → Text saves the header line as the title and blanks the image", () => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", image: IMAGE }, body));
      store.set(templateEditorAtom, {
        state: { doc: { firstChild: { textContent: "  Kept title  " } } },
      } as never);
      mount();

      pick("Text");

      expect(savedElements(store)[0]).toEqual({ type: "meta", title: "Kept title", image: "" });
    });

    it("Image → Text without an editor saves a blank title", () => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", image: IMAGE }, body));
      mount();

      pick("Text");

      expect(savedElements(store)[0]).toEqual({ type: "meta", title: "", image: "" });
    });

    it("does not save when the picked type is already selected", () => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", title: "Hi" }, body));
      mount();

      pick("Text");

      expect(store.get(pendingAutoSaveAtom)).toBeNull();
    });

    it("removes an uploaded image and stays on Image", () => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", image: IMAGE }, body));
      mount();

      fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

      expect(savedElements(store)[0]).toEqual({ type: "meta", image: "" });
      expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("data-state", "active");
      expect(screen.queryByRole("button", { name: "Remove image" })).toBeNull();
    });
  });

  describe("a selected button", () => {
    const track: ElementalNode = {
      type: "action",
      content: "Track",
      href: "https://example.com/t",
    };

    beforeEach(() => {
      store.set(templateEditorContentAtom, whatsapp({ type: "meta", title: "Hi" }, body, track));
      store.set(selectedWhatsappButtonAtom, 0);
    });

    it("opens its form instead of the header type", () => {
      mount();

      expect(screen.getByLabelText("Label")).toHaveValue("Track");
      expect(screen.getByLabelText("Link")).toHaveValue("https://example.com/t");
      expect(screen.queryByRole("tab", { name: "Text" })).toBeNull();
    });

    it("saves label and link edits to that button", () => {
      mount();

      fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Track order" } });
      fireEvent.change(screen.getByLabelText("Link"), {
        target: { value: "https://example.com/o" },
      });

      expect(savedElements(store).at(-1)).toEqual({
        type: "action",
        content: "Track order",
        href: "https://example.com/o",
      });
    });

    it("closes the form", () => {
      mount();

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(store.get(selectedWhatsappButtonAtom)).toBeNull();
    });

    it("shows nothing for a button that no longer exists", () => {
      act(() => store.set(selectedWhatsappButtonAtom, 5));
      mount();

      expect(screen.queryByLabelText("Label")).toBeNull();
    });
  });
});
