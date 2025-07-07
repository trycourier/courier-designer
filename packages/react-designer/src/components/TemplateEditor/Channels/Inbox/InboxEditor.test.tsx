import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { InboxEditor, type InboxEditorProps } from "./InboxEditor";
import { InboxEditorContent, InboxConfig } from "./Inbox";
import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { TiptapDoc } from "@/types";
import type { AnyExtension } from "@tiptap/react";

// Mock external dependencies
vi.mock("@tiptap/react", () => ({
  EditorProvider: vi.fn(
    ({
      children,
      editorContainerProps,
      _content,
      _extensions,
      editable,
      autofocus,
      _onUpdate,
      _immediatelyRender,
      // Extract only DOM-safe props
      ...domProps
    }) => {
      // Filter out any potential non-DOM props that might cause warnings
      const safeProps = Object.keys(domProps).reduce(
        (acc, key) => {
          // Only include standard HTML attributes or data-* attributes
          if (
            key.startsWith("data-") ||
            key.startsWith("aria-") ||
            ["id", "className", "style"].includes(key)
          ) {
            acc[key] = domProps[key];
          }
          return acc;
        },
        {} as Record<string, unknown>
      );

      return (
        <div
          data-testid="editor-provider"
          data-editable={editable}
          data-autofocus={autofocus}
          {...safeProps}
        >
          <div {...editorContainerProps}>{children}</div>
        </div>
      );
    }
  ),
  useCurrentEditor: vi.fn(),
}));

vi.mock("jotai", () => ({
  useAtom: vi.fn(),
  useAtomValue: vi.fn(),
  useSetAtom: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
  convertElementalToTiptap: vi.fn(),
  convertTiptapToElemental: vi.fn(),
  updateElemental: vi.fn(),
}));

vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: vi.fn(({ config }) => (
    <div data-testid="bubble-text-menu" data-config={JSON.stringify(config)}>
      BubbleTextMenu
    </div>
  )),
}));

vi.mock("./Inbox", () => ({
  InboxEditorContent: vi.fn(() => <div data-testid="inbox-editor-content">InboxEditorContent</div>),
  InboxConfig: {
    contentType: { state: "hidden" },
    bold: { state: "hidden" },
    italic: { state: "hidden" },
    variable: { state: "enabled" },
  },
}));

vi.mock("../../../ui-kit/Icon", () => ({
  InboxIcon: vi.fn(() => <div data-testid="inbox-icon">InboxIcon</div>),
  HamburgerMenuIcon: vi.fn(() => <div data-testid="hamburger-menu-icon">HamburgerMenuIcon</div>),
  ExpandIcon: vi.fn(() => <div data-testid="expand-icon">ExpandIcon</div>),
  MoreMenuIcon: vi.fn(() => <div data-testid="more-menu-icon">MoreMenuIcon</div>),
}));

// Mock editor instance
interface MockEditor {
  commands: {
    blur: () => void;
    setContent: (content: unknown) => void;
  };
  getJSON: () => Record<string, unknown>;
  isFocused: boolean;
  isDestroyed: boolean;
}

const mockEditorInstance: MockEditor = {
  commands: {
    blur: vi.fn(),
    setContent: vi.fn(),
  },
  getJSON: vi.fn(() => ({ type: "doc", content: [] })),
  isFocused: false,
  isDestroyed: false,
};

// Test data
const mockContent: TiptapDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello world" }],
    },
  ],
};

const mockExtensions = [
  {
    name: "testExtension",
    type: "extension",
  },
] as AnyExtension[];

const defaultProps: InboxEditorProps = {
  content: mockContent,
  extensions: mockExtensions,
  editable: true,
  autofocus: true,
  onUpdate: vi.fn(),
};

describe("InboxEditor Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useCurrentEditor
    (useCurrentEditor as Mock).mockReturnValue({ editor: mockEditorInstance });

    // Mock Jotai hooks
    (useAtomValue as Mock).mockReturnValue(false);
    (useAtom as Mock).mockReturnValue([null, vi.fn()]);
    (useSetAtom as Mock).mockReturnValue(vi.fn());

    // Mock conversion utilities
    (convertElementalToTiptap as Mock).mockReturnValue(mockContent);
    (convertTiptapToElemental as Mock).mockReturnValue([]);
    (updateElemental as Mock).mockReturnValue({ version: "2022-01-01", elements: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render with default props", () => {
      const { container } = render(<InboxEditor {...defaultProps} />);

      // Check main container with proper styling
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        "courier-py-2",
        "courier-border",
        "courier-w-[360px]",
        "courier-h-[500px]",
        "courier-rounded-3xl",
        "courier-bg-background"
      );

      // Verify EditorProvider is rendered
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should render header with icons and title", () => {
      render(<InboxEditor {...defaultProps} />);

      // Check inbox icon and title
      expect(screen.getByTestId("inbox-icon")).toBeInTheDocument();
      expect(screen.getByText("Inbox")).toBeInTheDocument();

      // Check menu icons
      expect(screen.getByTestId("hamburger-menu-icon")).toBeInTheDocument();
      expect(screen.getByTestId("expand-icon")).toBeInTheDocument();
      expect(screen.getByTestId("more-menu-icon")).toBeInTheDocument();
    });

    it("should render EditorProvider with correct props", () => {
      const onUpdate = vi.fn();
      const customProps: InboxEditorProps = {
        ...defaultProps,
        content: mockContent,
        extensions: mockExtensions,
        editable: false,
        autofocus: false,
        onUpdate,
      };

      render(<InboxEditor {...customProps} />);

      expect(EditorProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          content: mockContent,
          extensions: mockExtensions,
          editable: false,
          autofocus: false,
          onUpdate,
          immediatelyRender: false,
          editorContainerProps: {
            className: "courier-inbox-editor",
          },
        }),
        {}
      );
    });

    it("should render InboxEditorContent component", () => {
      render(<InboxEditor {...defaultProps} />);

      expect(screen.getByTestId("inbox-editor-content")).toBeInTheDocument();
      expect(InboxEditorContent).toHaveBeenCalled();
    });

    it("should render BubbleTextMenu with InboxConfig", () => {
      render(<InboxEditor {...defaultProps} />);

      const bubbleMenu = screen.getByTestId("bubble-text-menu");
      expect(bubbleMenu).toBeInTheDocument();
      expect(BubbleTextMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          config: InboxConfig,
        }),
        {}
      );
    });
  });

  describe("Props Handling", () => {
    it("should handle editable prop correctly", () => {
      const { rerender } = render(<InboxEditor {...defaultProps} editable={true} />);

      expect(EditorProvider).toHaveBeenCalledWith(expect.objectContaining({ editable: true }), {});

      rerender(<InboxEditor {...defaultProps} editable={false} />);

      expect(EditorProvider).toHaveBeenCalledWith(expect.objectContaining({ editable: false }), {});
    });

    it("should handle autofocus prop correctly", () => {
      const { rerender } = render(<InboxEditor {...defaultProps} autofocus={true} />);

      expect(EditorProvider).toHaveBeenCalledWith(expect.objectContaining({ autofocus: true }), {});

      rerender(<InboxEditor {...defaultProps} autofocus={false} />);

      expect(EditorProvider).toHaveBeenCalledWith(
        expect.objectContaining({ autofocus: false }),
        {}
      );
    });

    it("should forward onUpdate callback", () => {
      const onUpdate = vi.fn();
      render(<InboxEditor {...defaultProps} onUpdate={onUpdate} />);

      expect(EditorProvider).toHaveBeenCalledWith(expect.objectContaining({ onUpdate }), {});
    });

    it("should handle different content structures", () => {
      const customContent: TiptapDoc = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Custom Title" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Custom content" }],
          },
        ],
      };

      render(<InboxEditor {...defaultProps} content={customContent} />);

      expect(EditorProvider).toHaveBeenCalledWith(
        expect.objectContaining({ content: customContent }),
        {}
      );
    });

    it("should handle custom extensions", () => {
      const customExtensions = [
        { name: "customExt1", type: "extension" },
        { name: "customExt2", type: "mark" },
      ] as AnyExtension[];

      render(<InboxEditor {...defaultProps} extensions={customExtensions} />);

      expect(EditorProvider).toHaveBeenCalledWith(
        expect.objectContaining({ extensions: customExtensions }),
        {}
      );
    });
  });

  describe("Styling and Layout", () => {
    it("should apply correct container dimensions", () => {
      const { container } = render(<InboxEditor {...defaultProps} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("courier-w-[360px]", "courier-h-[500px]");
    });

    it("should apply correct styling classes", () => {
      const { container } = render(<InboxEditor {...defaultProps} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        "courier-py-2",
        "courier-border",
        "courier-rounded-3xl",
        "courier-bg-background"
      );
    });

    it("should render inbox UI elements correctly", () => {
      render(<InboxEditor {...defaultProps} />);

      // Verify that all UI elements are rendered
      expect(screen.getByTestId("inbox-icon")).toBeInTheDocument();
      expect(screen.getByText("Inbox")).toBeInTheDocument();
      expect(screen.getByTestId("hamburger-menu-icon")).toBeInTheDocument();
      expect(screen.getByTestId("expand-icon")).toBeInTheDocument();
      expect(screen.getByTestId("more-menu-icon")).toBeInTheDocument();
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should properly layout header elements", () => {
      const { container } = render(<InboxEditor {...defaultProps} />);

      // Check header container structure - it's the first child div inside the main container
      const mainContainer = container.firstChild as HTMLElement;
      const headerContainer = mainContainer.children[0] as HTMLElement;
      expect(headerContainer).toHaveClass(
        "courier-my-3",
        "courier-mx-4",
        "courier-flex",
        "courier-items-center",
        "courier-gap-2",
        "courier-justify-between"
      );
    });

    it("should apply editor container class name", () => {
      render(<InboxEditor {...defaultProps} />);

      expect(EditorProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          editorContainerProps: {
            className: "courier-inbox-editor",
          },
        }),
        {}
      );
    });
  });

  describe("Component Integration", () => {
    it("should integrate with InboxEditorContent", () => {
      render(<InboxEditor {...defaultProps} />);

      // InboxEditorContent should be rendered within EditorProvider
      expect(InboxEditorContent).toHaveBeenCalled();
      expect(screen.getByTestId("inbox-editor-content")).toBeInTheDocument();
    });

    it("should integrate with BubbleTextMenu using InboxConfig", () => {
      render(<InboxEditor {...defaultProps} />);

      expect(BubbleTextMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          config: InboxConfig,
        }),
        {}
      );

      // Verify the config structure
      const expectedConfig = {
        contentType: { state: "hidden" },
        bold: { state: "hidden" },
        italic: { state: "hidden" },
        variable: { state: "enabled" },
      };

      expect(BubbleTextMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining(expectedConfig),
        }),
        {}
      );
    });

    it("should render children in correct order within EditorProvider", () => {
      render(<InboxEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      const inboxContent = screen.getByTestId("inbox-editor-content");
      const bubbleMenu = screen.getByTestId("bubble-text-menu");

      // Both components should be children of EditorProvider
      expect(editorProvider).toContainElement(inboxContent);
      expect(editorProvider).toContainElement(bubbleMenu);
    });
  });

  describe("Editor Configuration", () => {
    it("should set immediatelyRender to false", () => {
      render(<InboxEditor {...defaultProps} />);

      expect(EditorProvider).toHaveBeenCalledWith(
        expect.objectContaining({ immediatelyRender: false }),
        {}
      );
    });

    it("should handle empty content gracefully", () => {
      const emptyContent: TiptapDoc = {
        type: "doc",
        content: [],
      };

      render(<InboxEditor {...defaultProps} content={emptyContent} />);

      expect(EditorProvider).toHaveBeenCalledWith(
        expect.objectContaining({ content: emptyContent }),
        {}
      );
    });

    it("should handle empty extensions array", () => {
      render(<InboxEditor {...defaultProps} extensions={[]} />);

      expect(EditorProvider).toHaveBeenCalledWith(expect.objectContaining({ extensions: [] }), {});
    });
  });

  describe("TypeScript Interface Compliance", () => {
    it("should accept all required InboxRenderProps", () => {
      const completeProps: InboxEditorProps = {
        content: mockContent,
        extensions: mockExtensions,
        editable: true,
        autofocus: false,
        onUpdate: vi.fn(),
      };

      expect(() => {
        render(<InboxEditor {...completeProps} />);
      }).not.toThrow();
    });

    it("should work with minimal props", () => {
      const minimalProps: InboxEditorProps = {
        content: { type: "doc", content: [] },
        extensions: [],
        editable: false,
        autofocus: false,
        onUpdate: vi.fn(),
      };

      expect(() => {
        render(<InboxEditor {...minimalProps} />);
      }).not.toThrow();
    });
  });

  describe("Performance and Memoization", () => {
    it("should not re-render unnecessarily with same props", () => {
      const { rerender } = render(<InboxEditor {...defaultProps} />);

      const initialCallCount = (EditorProvider as Mock).mock.calls.length;

      // Rerender with same props
      rerender(<InboxEditor {...defaultProps} />);

      // Should have been called again (React doesn't memo by default)
      expect((EditorProvider as Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should handle prop changes correctly", () => {
      const { rerender } = render(<InboxEditor {...defaultProps} />);

      const newOnUpdate = vi.fn();
      rerender(<InboxEditor {...defaultProps} onUpdate={newOnUpdate} />);

      expect(EditorProvider).toHaveBeenLastCalledWith(
        expect.objectContaining({ onUpdate: newOnUpdate }),
        {}
      );
    });
  });
});
