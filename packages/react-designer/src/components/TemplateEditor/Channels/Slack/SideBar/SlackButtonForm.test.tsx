import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { linkTrackingEnabledAtom } from "@/components/TemplateEditor/store";
import { SlackButtonForm } from "./SlackButtonForm";

// The switch measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("@/components/ui/VariableEditor", () => ({
  VariableTextarea: () => <textarea />,
}));

const element = {
  attrs: { id: "b1", label: "Go", link: "https://example.com", disableTracking: false },
} as unknown as ProseMirrorNode;
const editor = {
  state: { doc: { descendants: vi.fn() } },
  on: vi.fn(),
  off: vi.fn(),
  isDestroyed: false,
} as unknown as Editor;

const renderForm = (showLinkTracking?: boolean) => {
  const store = createStore();
  store.set(linkTrackingEnabledAtom, true);
  render(
    <Provider store={store}>
      <SlackButtonForm element={element} editor={editor} showLinkTracking={showLinkTracking} />
    </Provider>
  );
};

describe("SlackButtonForm link tracking", () => {
  it("shows the link-tracking switch where asked (Teams tracks its button links)", () => {
    renderForm(true);
    expect(screen.getByText("Link tracking")).toBeInTheDocument();
  });

  it("leaves it out by default, as Slack's form always has", () => {
    renderForm();
    expect(screen.queryByText("Link tracking")).toBeNull();
  });
});
