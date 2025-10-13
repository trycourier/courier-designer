import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnyExtension } from "@tiptap/react";
import type { TiptapDoc } from "@/lib/utils";
import type { UniqueIdentifier } from "@dnd-kit/core";

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

// Mock MSTeamsFrame
vi.mock("./MSTeamsFrame", () => ({
  MSTeamsFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="msteams-frame">{children}</div>
  ),
}));

// Mock MSTeamsEditorContent and MSTeamsConfig
vi.mock("./MSTeams", () => ({
  MSTeamsEditorContent: ({ value }: { value?: TiptapDoc }) => (
    <div data-testid="msteams-editor-content" data-value={JSON.stringify(value)}>
      MSTeams Editor Content
    </div>
  ),
  MSTeamsConfig: {
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
    link: { state: "enabled" },
    variable: { state: "enabled" },
  },
}));

// Mock BubbleTextMenu
vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: ({ config }: { config: unknown }) => (
    <div data-testid="bubble-text-menu" data-config={JSON.stringify(config)}>
      Bubble Text Menu
    </div>
  ),
}));

// Mock @dnd-kit/sortable
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children, items, strategy }: { children: React.ReactNode; items: UniqueIdentifier[]; strategy: unknown }) => (
    <div data-testid="sortable-context" data-items={JSON.stringify(items)} data-strategy={!!strategy}>
      {children}
    </div>
  ),
  verticalListSortingStrategy: { name: "verticalListSortingStrategy" },
}));

// Mock @dnd-kit/core
vi.mock("@dnd-kit/core", () => ({
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
  })),
}));

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" "),
}));

// Import component after mocks
import { MSTeamsEditor } from "./MSTeamsEditor";
import type { MSTeamsEditorProps } from "./MSTeamsEditor";
import { useDroppable } from "@dnd-kit/core";

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
  Sidebar: ["text", "divider", "button"],
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
      expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
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
      const sortableContext = screen.getByTestId("sortable-context");
      const editorProvider = screen.getByTestId("editor-provider");

      expect(msteamsFrame).toContainElement(sortableContext);
      expect(sortableContext).toContainElement(editorProvider);
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

    it("should pass items to SortableContext", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      const sortableContext = screen.getByTestId("sortable-context");
      expect(sortableContext).toHaveAttribute("data-items", JSON.stringify(mockItems.Editor));
    });
  });

  describe("Drag and Drop Integration", () => {
    it("should call useDroppable with Editor id", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      expect(useDroppable).toHaveBeenCalledWith({ id: "Editor" });
    });

    it("should render SortableContext with items and strategy", () => {
      render(<MSTeamsEditor {...defaultProps} />);

      const sortableContext = screen.getByTestId("sortable-context");
      expect(sortableContext).toHaveAttribute("data-items", JSON.stringify(mockItems.Editor));
      expect(sortableContext).toHaveAttribute("data-strategy", "true");
    });

    it("should handle empty Editor items", () => {
      const emptyItems = { ...mockItems, Editor: [] as UniqueIdentifier[] };
      render(<MSTeamsEditor {...defaultProps} items={emptyItems} />);

      const sortableContext = screen.getByTestId("sortable-context");
      expect(sortableContext).toHaveAttribute("data-items", JSON.stringify([]));
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
});
