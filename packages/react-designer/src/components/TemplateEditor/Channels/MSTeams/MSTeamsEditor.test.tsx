import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnyExtension } from "@tiptap/react";
import type { TiptapDoc } from "@/lib/utils";
import type { VisibleBlockItem } from "@/components/TemplateEditor/store";
type UniqueIdentifier = string | number;

// Mock TipTap EditorProvider
const mockOnUpdate = vi.fn();
const mockEditor = {
  storage: {
    variable: {
      variableViewMode: "show-variables",
    },
  },
  state: {
    tr: {
      setMeta: vi.fn().mockReturnThis(),
    },
  },
  view: {
    dispatch: vi.fn(),
  },
};

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
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}));

// Mock MSTeamsFrame
vi.mock("./MSTeamsFrame", () => ({
  MSTeamsFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="msteams-frame">{children}</div>
  ),
}));

// Mock MSTeamsEditorContent
vi.mock("./MSTeams", () => ({
  MSTeamsEditorContent: ({ value }: { value?: TiptapDoc }) => (
    <div data-testid="msteams-editor-content" data-value={JSON.stringify(value)}>
      MSTeams Editor Content
    </div>
  ),
  defaultMSTeamsContent: [],
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
import { MSTeamsEditor } from "./MSTeamsEditor";
import type { MSTeamsEditorProps } from "./MSTeamsEditor";

// Test data
const mockContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Test MSTeams content" }],
    },
  ],
} as const satisfies TiptapDoc;

const mockExtensions: AnyExtension[] = [
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  { name: "testExtension", type: "extension" } as AnyExtension,
];

const mockItems = {
  Sidebar: ["text", "divider", "list"] as const satisfies VisibleBlockItem[],
  Editor: ["item1", "item2"] as UniqueIdentifier[],
};

const defaultProps: MSTeamsEditorProps = {
  content: mockContent,
  extensions: mockExtensions,
  editable: true,
  autofocus: true,
  onUpdate: mockOnUpdate,
  items: mockItems,
  selectedNode: null,
  msteamsEditor: null,
};

describe("MSTeamsEditor Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnUpdate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render with all components", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      expect(screen.getByTestId("msteams-frame")).toBeInTheDocument();
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(screen.getByTestId("msteams-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
    });

    it("should return null when content is missing", () => {
      const { container } = render(
        <MSTeamsEditor {...defaultProps} content={null as unknown as TiptapDoc} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render with correct component hierarchy", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      const msteamsFrame = screen.getByTestId("msteams-frame");
      const editorProvider = screen.getByTestId("editor-provider");

      expect(msteamsFrame).toContainElement(editorProvider);
    });
  });

  describe("Props Handling", () => {
    it("should pass content and extensions to EditorProvider", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-content", JSON.stringify(mockContent));
      expect(editorProvider).toHaveAttribute("data-extensions", "1");
    });

    it("should handle editable and autofocus props", () => {
      render(<MSTeamsEditor {...defaultProps} editable={true} autofocus={true} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-editable", "true");
      expect(editorProvider).toHaveAttribute("data-autofocus", "true");
    });

    it("should pass onUpdate callback", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-on-update", "true");
    });
  });

  describe("Styling", () => {
    it("should apply courier-msteams-editor CSS class", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveClass("courier-msteams-editor");
    });
  });

  describe("Error Handling", () => {
    it("should handle null content gracefully", () => {
      const { container } = render(
        <MSTeamsEditor {...defaultProps} content={null as unknown as TiptapDoc} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Read-Only Mode", () => {
    it("should render ReadOnlyEditorContent when readOnly is true", () => {
      render(<MSTeamsEditor {...defaultProps} readOnly={true} />);

      expect(screen.getByTestId("readonly-editor-content")).toBeInTheDocument();
      expect(screen.queryByTestId("bubble-text-menu")).not.toBeInTheDocument();
      expect(screen.queryByTestId("msteams-editor-content")).not.toBeInTheDocument();
    });

    it("should render MSTeamsEditorContent and BubbleTextMenu when readOnly is false", () => {
      render(<MSTeamsEditor {...defaultProps} readOnly={false} />);

      expect(screen.getByTestId("msteams-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });

    it("should default to editable mode when readOnly is not specified", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      expect(screen.getByTestId("msteams-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });
  });
});
