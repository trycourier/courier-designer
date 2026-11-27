import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { NodeViewProps } from "@tiptap/react";
import { ButtonComponentNode } from "./ButtonComponent";

vi.mock("@tiptap/react", () => ({
  NodeViewContent: (props: Record<string, unknown>) => (
    <span data-node-view-content="" {...props} />
  ),
}));
vi.mock("../../ui/SortableItemWrapper", () => ({
  SortableItemWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const labelIn = (extensionNames: string[]) => {
  const props = {
    node: { attrs: { id: "b1", link: "https://example.com", isSelected: false } },
    editor: {
      isEditable: true,
      on: vi.fn(),
      off: vi.fn(),
      state: { doc: { descendants: vi.fn() } },
      extensionManager: { extensions: extensionNames.map((name) => ({ name })) },
    },
    getPos: () => 0,
  } as unknown as NodeViewProps;
  const { container } = render(
    <Provider store={createStore()}>
      <ButtonComponentNode {...props} />
    </Provider>
  );
  return container.querySelector("[data-node-view-content]");
};

describe("Button label editing", () => {
  it("keeps a Teams button's label out of inline editing; its sidebar form edits it", () => {
    expect(labelIn(["button", "msteamsButtonLabelLock"])?.getAttribute("contenteditable")).toBe(
      "false"
    );
  });

  it("keeps the label editable inline in other editors", () => {
    expect(labelIn(["button"])?.hasAttribute("contenteditable")).toBe(false);
  });
});
