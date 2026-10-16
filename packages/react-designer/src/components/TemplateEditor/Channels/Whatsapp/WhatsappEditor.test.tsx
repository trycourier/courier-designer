import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import type { ElementalActionNode } from "@/types/elemental.types";
import { WhatsappEditor } from "./WhatsappEditor";
import { WhatsappConfig } from "./Whatsapp";

vi.mock("@tiptap/react", () => ({
  EditorProvider: ({ editable, children }: { editable?: boolean; children?: React.ReactNode }) => (
    <div data-testid="editor-provider" data-editable={String(editable)}>
      {children}
    </div>
  ),
  useCurrentEditor: vi.fn(() => ({ editor: null })),
}));

vi.mock("../../IPhoneFrame", () => ({
  IPhoneFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="iphone-frame">{children}</div>
  ),
}));

vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: () => <div data-testid="bubble-text-menu" />,
}));

vi.mock("../../ReadOnlyEditorContent", () => ({
  ReadOnlyEditorContent: () => <div data-testid="read-only-content" />,
}));

vi.mock("./WhatsappHeaderImage", () => ({
  WhatsappHeaderImage: ({ src, editable }: { src: string; editable: boolean }) => (
    <div data-testid="header-image" data-src={src} data-editable={String(editable)} />
  ),
}));

vi.mock("./WhatsappButtonRows", () => ({
  WhatsappButtonRows: ({ actions, editable }: { actions: unknown[]; editable: boolean }) => (
    <div data-testid="button-rows" data-count={actions.length} data-editable={String(editable)} />
  ),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  dropTargetForElements: vi.fn(() => () => {}),
}));

const track: ElementalActionNode = {
  type: "action",
  content: "Track",
  href: "https://example.com/t",
};

describe("WhatsappEditor", () => {
  let store: ReturnType<typeof createStore>;

  const mount = (props: Partial<React.ComponentProps<typeof WhatsappEditor>> = {}) =>
    render(
      <Provider store={store}>
        <WhatsappEditor
          content={null}
          items={{ Sidebar: [], Editor: [] }}
          textMenuConfig={WhatsappConfig}
          selectedNode={null}
          whatsappEditor={null}
          actions={[]}
          extensions={[]}
          editable
          autofocus={false}
          onUpdate={() => {}}
          {...props}
        />
      </Provider>
    );

  const canvas = () => screen.getByTestId("editor-provider").parentElement!;

  beforeEach(() => {
    store = createStore();
  });

  it("draws the message in the phone frame, with the text menu while editing", () => {
    mount();

    expect(screen.getByTestId("iphone-frame")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
  });

  it("shows the header line for a text header, and no image", () => {
    mount({ header: { type: "text", content: "Hi" } });

    expect(screen.queryByTestId("header-image")).toBeNull();
    expect(canvas()).not.toHaveClass("courier-whatsapp-editor-image-header");
  });

  it("hides the header line and shows the image for an image header", () => {
    mount({ header: { type: "image", src: "https://cdn.example.com/a.jpg" } });

    expect(screen.getByTestId("header-image")).toHaveAttribute(
      "data-src",
      "https://cdn.example.com/a.jpg"
    );
    expect(canvas()).toHaveClass("courier-whatsapp-editor-image-header");
  });

  it("draws the buttons under the bubble", () => {
    mount({ actions: [track, track] });

    expect(screen.getByTestId("button-rows")).toHaveAttribute("data-count", "2");
  });

  it("is not editable read-only, image and buttons included", () => {
    mount({ readOnly: true, header: { type: "image", src: "" }, actions: [track] });

    expect(screen.getByTestId("read-only-content")).toBeInTheDocument();
    expect(screen.queryByTestId("bubble-text-menu")).toBeNull();
    expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-editable", "false");
    expect(screen.getByTestId("header-image")).toHaveAttribute("data-editable", "false");
    expect(screen.getByTestId("button-rows")).toHaveAttribute("data-editable", "false");
  });
});
