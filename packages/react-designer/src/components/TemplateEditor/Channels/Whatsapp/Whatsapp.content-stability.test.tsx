import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import {
  isTemplateTransitioningAtom,
  pendingAutoSaveAtom,
  templateEditorContentAtom,
} from "../../store";
import { isTemplateLoadingAtom } from "../../../Providers/store";
import { Whatsapp, type WhatsappRenderProps } from "./Whatsapp";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

vi.mock("@/components/extensions/extension-kit", () => ({
  ExtensionKit: vi.fn(() => []),
}));

vi.mock("../../../ui/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock("../Channels", () => ({
  Channels: () => <div data-testid="channels">Channels</div>,
}));

const IMAGE = "https://cdn.example.com/order.jpg";
const track: ElementalNode = { type: "action", content: "Track", href: "https://example.com/t" };

const whatsapp = (...elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "whatsapp", elements }],
});

/** What Tiptap hands onUpdate: the header line, then the body. */
const doc = (title: string, ...paragraphs: string[]) => ({
  getJSON: () => ({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: title ? [{ type: "text", text: title }] : [],
      },
      ...paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
    ],
  }),
});

type UpdateArg = Parameters<WhatsappRenderProps["onUpdate"]>[0];

describe("Whatsapp content stability", () => {
  let store: ReturnType<typeof createStore>;
  let props: WhatsappRenderProps | undefined;

  const Capture = (renderProps: WhatsappRenderProps) => {
    props = renderProps;
    return null;
  };

  const mount = (routing = { method: "single" as const, channels: ["whatsapp" as const] }) =>
    render(
      <Provider store={store}>
        <Whatsapp routing={routing} render={Capture} />
      </Provider>
    );

  const update = (editor: ReturnType<typeof doc>) =>
    act(() => props!.onUpdate({ editor } as unknown as UpdateArg));

  const savedChannel = () =>
    (store.get(pendingAutoSaveAtom) as ElementalContent | null)?.elements.find(
      (el) => el.type === "channel" && el.channel === "whatsapp"
    ) as { elements: ElementalNode[]; [key: string]: unknown } | undefined;

  beforeEach(() => {
    store = createStore();
    props = undefined;
    store.set(isTemplateLoadingAtom, false);
    store.set(isTemplateTransitioningAtom, false);
    store.set(pendingAutoSaveAtom, null);
    store.set(
      templateEditorContentAtom,
      whatsapp({ type: "meta", title: "Order update" }, { type: "text", content: "Body" }, track)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the content prop stable when the template content changes from outside", () => {
    mount();
    const first = props!.content;

    act(() => store.set(templateEditorContentAtom, whatsapp({ type: "meta", title: "Changed" })));

    expect(props!.content).toBe(first);
  });

  // The placeholder doc mounted while loading would replace the draft (as C-21461 for SMS and Push).
  it("does not auto-save the placeholder doc while the template is loading", () => {
    store.set(isTemplateLoadingAtom, true);
    store.set(templateEditorContentAtom, null);
    mount();

    update(doc(""));

    expect(store.get(pendingAutoSaveAtom)).toBeNull();
    expect(store.get(templateEditorContentAtom)).toBeNull();
  });

  it("ignores updates while the template is switching", () => {
    store.set(isTemplateTransitioningAtom, true);
    mount();

    update(doc("Other", "Other body"));

    expect(store.get(pendingAutoSaveAtom)).toBeNull();
  });

  it("saves the header line to meta.title, the body after it, and keeps the buttons", () => {
    mount();

    update(doc("Your order", "Shipped today."));

    const elements = savedChannel()!.elements;
    expect(elements[0]).toEqual({ type: "meta", title: "Your order" });
    expect(elements.at(-1)).toEqual(track);
    expect(JSON.stringify(elements.slice(1, -1))).toContain("Shipped today.");
  });

  it("does not save when nothing changed", () => {
    store.set(templateEditorContentAtom, null);
    mount();
    update(doc("Your order", "Shipped today."));
    const saved = store.get(pendingAutoSaveAtom);
    store.set(pendingAutoSaveAtom, null);

    update(doc("Your order", "Shipped today."));

    expect(saved).not.toBeNull();
    expect(store.get(pendingAutoSaveAtom)).toBeNull();
  });

  it("starts a new template as a WhatsApp channel with its header in meta", () => {
    store.set(templateEditorContentAtom, null);
    mount();

    update(doc("", "Hello"));

    const saved = store.get(pendingAutoSaveAtom) as ElementalContent;
    expect(saved.elements).toHaveLength(1);
    expect(savedChannel()!.elements[0]).toEqual({ type: "meta", title: "" });
  });

  it("keeps an image header while the hidden header line is edited", () => {
    store.set(templateEditorContentAtom, whatsapp({ type: "meta", image: IMAGE }));
    mount();

    update(doc("Typed while hidden", "Body"));

    expect(savedChannel()!.elements[0]).toEqual({ type: "meta", image: IMAGE });
  });

  it("drops a block-level header saved before D-045", () => {
    const staleBlock = {
      type: "channel",
      channel: "whatsapp",
      header: { type: "image", src: IMAGE },
      elements: [{ type: "meta", image: IMAGE }],
    };
    store.set(templateEditorContentAtom, {
      version: "2022-01-01",
      elements: [staleBlock as unknown as ElementalNode],
    });
    mount();

    update(doc("", "Body"));

    expect(savedChannel()).not.toHaveProperty("header");
  });

  // The header line stays first and only text and lists drop into the body, on every drop path.
  it("gives its editor drop rules for a fixed header line", () => {
    mount();

    const rules = props!.extensions.find((extension) => extension.name === "dropRules");
    expect(rules?.options).toEqual({ fixedFirstBlock: true, sidebarTypes: ["text", "list"] });
  });

  it("passes the saved header and buttons to the canvas", () => {
    store.set(templateEditorContentAtom, whatsapp({ type: "meta", image: IMAGE }, track));
    mount();

    expect(props!.header).toEqual({ type: "image", src: IMAGE });
    expect(props!.actions).toEqual([track]);
  });
});
