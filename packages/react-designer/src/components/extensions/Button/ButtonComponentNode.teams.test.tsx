import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { NodeViewProps } from "@tiptap/react";
import { channelAtom } from "@/store";
import { ButtonComponentNode } from "./ButtonComponent";

vi.mock("@tiptap/react", () => ({
  NodeViewContent: (props: Record<string, unknown>) => (
    <span data-node-view-content="" {...props} />
  ),
}));
vi.mock("../../ui/SortableItemWrapper", () => ({
  SortableItemWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const props = {
  node: { attrs: { id: "b1", link: "https://example.com", isSelected: false } },
  editor: { isEditable: true, on: vi.fn(), off: vi.fn(), state: { doc: { descendants: vi.fn() } } },
  getPos: () => 0,
} as unknown as NodeViewProps;

const labelIn = (channel: "msteams" | "email") => {
  const store = createStore();
  store.set(channelAtom, channel);
  const { container } = render(
    <Provider store={store}>
      <ButtonComponentNode {...props} />
    </Provider>
  );
  return container.querySelector("[data-node-view-content]");
};

describe("Button label editing", () => {
  it("keeps a Teams button's label out of inline editing; its sidebar form edits it", () => {
    expect(labelIn("msteams")?.getAttribute("contenteditable")).toBe("false");
  });

  it("keeps the label editable inline on other channels", () => {
    expect(labelIn("email")?.hasAttribute("contenteditable")).toBe(false);
  });
});
