import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnyExtension } from "@tiptap/react";
import type { TiptapDoc } from "@/lib/utils";
type UniqueIdentifier = string | number;

// Mock TipTap EditorProvider
const mockOnUpdate = vi.fn();
vi.mock("@tiptap/react", () => ({
  EditorProvider: ({
    content,
    extensions,
    editable,
    autofocus,
    onUpdate,
    immediatelyRender,
    children,
    editorContainerProps,
  }: {
    content?: TiptapDoc;
    extensions?: AnyExtension[];
    editable?: boolean;
    autofocus?: boolean;
    onUpdate?: ({ editor }: { editor: unknown }) => void;
    immediatelyRender?: boolean;
    children?: React.ReactNode;
    editorContainerProps?: { className?: string };
  }) => (
    <div
      data-testid="editor-provider"
      data-content={JSON.stringify(content)}
      data-extensions={extensions?.length || 0}
      data-editable={editable}
      data-autofocus={autofocus}
      data-immediate-render={immediatelyRender}
      data-on-update={!!onUpdate}
      className={editorContainerProps?.className}
    >
      {children}
    </div>
  ),
}));

// Mock SlackFrame
vi.mock("./SlackFrame", () => ({
  SlackFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="slack-frame">{children}</div>
  ),
}));

// Mock SlackEditorContent and SlackConfig
vi.mock("./Slack", () => ({
  SlackEditorContent: ({ value }: { value?: TiptapDoc }) => (
    <div data-testid="slack-editor-content" data-value={JSON.stringify(value)}>
      Slack Editor Content
    </div>
  ),
  SlackConfig: {
    contentType: { state: "hidden" },
    bold: { state: "enabled" },
    italic: { state: "enabled" },
    underline: { state: "enabled" },
    strike: { state: "enabled" },
    alignLeft: { state: "hidden" },
    alignCenter: { state: "hidden" },
    alignRight: { state: "hidden" },
    alignJustify: { state: "hidden" },
    quote: { state: "enabled" },
    link: { state: "hidden" },
    variable: { state: "enabled" },
  },
  defaultSlackContent: [],
}));

// Mock BubbleTextMenu
vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: ({ config }: { config: unknown }) => (
    <div data-testid="bubble-text-menu" data-config={JSON.stringify(config)}>
      Bubble Text Menu
    </div>
  ),
}));

// Mock ReadOnlyEditorContent
vi.mock("../../ReadOnlyEditorContent", () => ({
  ReadOnlyEditorContent: () => (
    <div data-testid="readonly-editor-content">ReadOnlyEditorContent</div>
  ),
}));

// Mock pragmatic-drag-and-drop (no longer using dnd-kit)
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  dropTargetForElements: vi.fn(() => () => {}),
}));

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" "),
}));

// Import component after mocks
import { SlackEditor } from "./SlackEditor";
import type { SlackEditorProps } from "./SlackEditor";

// Test data
const mockContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Test Slack content" }],
    },
  ],
} as const satisfies TiptapDoc;

const mockExtensions: AnyExtension[] = [
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  { name: "testExtension", type: "extension" } as AnyExtension,
];

const mockItems = {
  Sidebar: ["text", "divider", "button"],
  Editor: ["item1", "item2"] as UniqueIdentifier[],
};

const defaultProps: SlackEditorProps = {
  content: mockContent,
  extensions: mockExtensions,
  editable: true,
  autofocus: true,
  onUpdate: mockOnUpdate,
  items: mockItems,
  selectedNode: null,
  slackEditor: null,
};

describe("SlackEditor Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnUpdate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render with all components", () => {
      render(<SlackEditor {...defaultProps} />);

      expect(screen.getByTestId("slack-frame")).toBeInTheDocument();
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(screen.getByTestId("slack-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
    });

    it("should return null when content is missing", () => {
      const { container } = render(
        <SlackEditor {...defaultProps} content={null as unknown as TiptapDoc} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render with correct component hierarchy", () => {
      render(<SlackEditor {...defaultProps} />);

      const slackFrame = screen.getByTestId("slack-frame");
      const editorProvider = screen.getByTestId("editor-provider");

      expect(slackFrame).toContainElement(editorProvider);
    });
  });

  describe("Props Handling", () => {
    it("should pass content and extensions to EditorProvider", () => {
      render(<SlackEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-content", JSON.stringify(mockContent));
      expect(editorProvider).toHaveAttribute("data-extensions", "1");
    });

    it("should handle editable and autofocus props", () => {
      render(<SlackEditor {...defaultProps} editable={true} autofocus={true} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-editable", "true");
      expect(editorProvider).toHaveAttribute("data-autofocus", "true");
    });

    it("should pass onUpdate callback", () => {
      render(<SlackEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-on-update", "true");
    });

  });

  describe("Styling", () => {
    it("should apply courier-slack-editor CSS class", () => {
      render(<SlackEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveClass("courier-slack-editor");
    });
  });

  describe("Error Handling", () => {
    it("should handle null content gracefully", () => {
      const { container } = render(
        <SlackEditor {...defaultProps} content={null as unknown as TiptapDoc} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Read-Only Mode", () => {
    it("should render ReadOnlyEditorContent when readOnly is true", () => {
      render(<SlackEditor {...defaultProps} readOnly={true} />);

      expect(screen.getByTestId("readonly-editor-content")).toBeInTheDocument();
      expect(screen.queryByTestId("bubble-text-menu")).not.toBeInTheDocument();
      expect(screen.queryByTestId("slack-editor-content")).not.toBeInTheDocument();
    });

    it("should render SlackEditorContent and BubbleTextMenu when readOnly is false", () => {
      render(<SlackEditor {...defaultProps} readOnly={false} />);

      expect(screen.getByTestId("slack-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });

    it("should default to editable mode when readOnly is not specified", () => {
      render(<SlackEditor {...defaultProps} />);

      expect(screen.getByTestId("slack-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });
  });
});
