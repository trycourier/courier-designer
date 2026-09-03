import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TiptapDoc } from "@/lib/utils";
import type { AnyExtension } from "@tiptap/react";

// Mock TipTap EditorProvider
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
    children,
    content: _content,
    extensions: _extensions,
    editable,
    autofocus,
    onUpdate: _onUpdate,
    editorContainerProps,
    immediatelyRender,
  }: {
    children: React.ReactNode;
    content: unknown;
    extensions: unknown[];
    editable: boolean;
    autofocus: boolean;
    onUpdate: (props: { editor: unknown }) => void;
    editorContainerProps?: { className?: string };
    immediatelyRender: boolean;
  }) => {
    // Filter out non-DOM props to prevent React warnings
    const safeProps: Record<string, unknown> = {};

    return (
      <div
        data-testid="editor-provider"
        data-editable={editable}
        data-autofocus={autofocus}
        data-immediately-render={immediatelyRender}
        {...safeProps}
      >
        <div {...editorContainerProps}>{children}</div>
      </div>
    );
  },
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}));

// Mock IPhoneFrame
vi.mock("../../IPhoneFrame", () => ({
  IPhoneFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="iphone-frame">{children}</div>
  ),
}));

// Mock PushEditorContent and related components from Push
vi.mock("./Push", () => ({
  PushEditorContent: () => <div data-testid="push-editor-content">PushEditorContent</div>,
  PushConfig: {
    contentType: { state: "hidden" },
    bold: { state: "hidden" },
    italic: { state: "hidden" },
    variable: { state: "enabled" },
  },
  defaultPushContent: [],
}));

// Mock BubbleTextMenu
vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: ({ config }: { config: Record<string, { state: string }> }) => (
    <div data-testid="bubble-text-menu" data-config={JSON.stringify(config)}>
      BubbleTextMenu
    </div>
  ),
}));

// Mock ReadOnlyEditorContent
vi.mock("../../ReadOnlyEditorContent", () => ({
  ReadOnlyEditorContent: () => (
    <div data-testid="readonly-editor-content">ReadOnlyEditorContent</div>
  ),
}));

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
}));

// Import component after mocks
import { PushEditor } from "./PushEditor";
import type { PushRenderProps } from "./Push";
import { cn } from "@/lib/utils";

// Test data
const mockContent: TiptapDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello push notification" }],
    },
  ],
};

const mockExtensions = [
  {
    name: "testExtension",
    type: "extension",
  },
] as AnyExtension[];

const defaultProps: PushRenderProps = {
  content: mockContent,
  extensions: mockExtensions,
  editable: true,
  autofocus: true,
  onUpdate: vi.fn(),
};

describe("PushEditor Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Date methods to return consistent values for testing
    const mockDate = new Date("2024-01-15T14:30:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Mock toLocaleDateString and toLocaleTimeString to return consistent values
    vi.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue("Monday, January 15");
    vi.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("3:30 PM");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render with default props", () => {
      render(<PushEditor {...defaultProps} />);

      expect(screen.getByTestId("iphone-frame")).toBeInTheDocument();
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(screen.getByTestId("push-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
    });

    it("should render date and time display", () => {
      render(<PushEditor {...defaultProps} />);

      // Check that date is displayed
      expect(screen.getByText(/Monday, January 15/i)).toBeInTheDocument();

      // Check that time is displayed (format may vary by locale)
      const timeElement = screen.getByText(/3:30/);
      expect(timeElement).toBeInTheDocument();
    });

    it("should render EditorProvider with correct props", () => {
      const onUpdate = vi.fn();
      const customProps = {
        ...defaultProps,
        content: mockContent,
        extensions: mockExtensions,
        editable: false,
        autofocus: false,
        onUpdate,
      };

      render(<PushEditor {...customProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-editable", "false");
      expect(editorProvider).toHaveAttribute("data-autofocus", "false");
      expect(editorProvider).toHaveAttribute("data-immediately-render", "false");
    });

    it("should render PushEditorContent component", () => {
      render(<PushEditor {...defaultProps} />);

      expect(screen.getByTestId("push-editor-content")).toBeInTheDocument();
    });

    it("should render BubbleTextMenu with PushConfig", () => {
      render(<PushEditor {...defaultProps} />);

      const bubbleTextMenu = screen.getByTestId("bubble-text-menu");
      expect(bubbleTextMenu).toBeInTheDocument();

      const expectedConfig = JSON.stringify({
        contentType: { state: "hidden" },
        bold: { state: "hidden" },
        italic: { state: "hidden" },
        variable: { state: "enabled" },
      });
      expect(bubbleTextMenu).toHaveAttribute("data-config", expectedConfig);
    });
  });

  describe("Props Handling", () => {
    it("should handle editable prop correctly", () => {
      render(<PushEditor {...defaultProps} editable={false} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-editable", "false");
    });

    it("should handle autofocus prop correctly", () => {
      render(<PushEditor {...defaultProps} autofocus={false} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-autofocus", "false");
    });

    it("should forward onUpdate callback", () => {
      const onUpdate = vi.fn();
      render(<PushEditor {...defaultProps} onUpdate={onUpdate} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      // The onUpdate prop is passed to EditorProvider but we can't directly test the callback
      // without triggering editor events, which would require more complex mocking
    });

    it("should handle different content structures", () => {
      const emptyContent: TiptapDoc = { type: "doc", content: [] };
      render(<PushEditor {...defaultProps} content={emptyContent} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle custom extensions", () => {
      const customExtensions = [{ name: "customExt", type: "extension" }] as AnyExtension[];

      render(<PushEditor {...defaultProps} extensions={customExtensions} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle className prop", () => {
      const customClassName = "custom-push-editor";
      render(<PushEditor {...defaultProps} className={customClassName} />);

      expect(cn).toHaveBeenCalledWith(
        "courier-px-4 courier-py-2 courier-text-[#A3A3A3] courier-text-center courier-my-8",
        customClassName
      );
    });
  });

  describe("Styling and Layout", () => {
    it("should apply correct styling classes to date/time container", () => {
      render(<PushEditor {...defaultProps} />);

      expect(cn).toHaveBeenCalledWith(
        "courier-px-4 courier-py-2 courier-text-[#A3A3A3] courier-text-center courier-my-8",
        undefined
      );
    });

    it("should apply correct CSS classes to date element", () => {
      const { container } = render(<PushEditor {...defaultProps} />);

      const dateElement = container.querySelector(".courier-text-lg.courier-font-medium");
      expect(dateElement).toBeInTheDocument();
    });

    it("should apply correct CSS classes to time element", () => {
      const { container } = render(<PushEditor {...defaultProps} />);

      const timeElement = container.querySelector(
        ".courier-text-5xl.courier-font-semibold.courier-mt-1"
      );
      expect(timeElement).toBeInTheDocument();
    });

    it("should apply push editor class to editor container", () => {
      render(<PushEditor {...defaultProps} />);

      expect(cn).toHaveBeenCalledWith("courier-push-editor");
    });
  });

  describe("Component Integration", () => {
    it("should integrate with IPhoneFrame", () => {
      render(<PushEditor {...defaultProps} />);

      const iPhoneFrame = screen.getByTestId("iphone-frame");
      expect(iPhoneFrame).toBeInTheDocument();

      // Date/time container should be inside the frame
      expect(iPhoneFrame).toContainElement(screen.getByText(/Monday, January 15/i));
    });

    it("should integrate with EditorProvider", () => {
      render(<PushEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toBeInTheDocument();

      // PushEditorContent should be inside EditorProvider
      expect(editorProvider).toContainElement(screen.getByTestId("push-editor-content"));
      expect(editorProvider).toContainElement(screen.getByTestId("bubble-text-menu"));
    });

    it("should render children in correct order within EditorProvider", () => {
      render(<PushEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      const children = Array.from(editorProvider.children);

      // Should have the editor container div
      expect(children).toHaveLength(1);

      const editorContainer = children[0];
      const editorChildren = Array.from(editorContainer.children);

      // PushEditorContent should come before BubbleTextMenu
      expect(editorChildren[0]).toHaveAttribute("data-testid", "push-editor-content");
      expect(editorChildren[1]).toHaveAttribute("data-testid", "bubble-text-menu");
    });
  });

  describe("Date and Time Display", () => {
    it("should display current date in correct format", () => {
      render(<PushEditor {...defaultProps} />);

      // Date should be formatted as "Weekday, Month Day"
      expect(screen.getByText("Monday, January 15")).toBeInTheDocument();
    });

    it("should display current time in correct format", () => {
      render(<PushEditor {...defaultProps} />);

      // Time should be formatted as hour:minute AM/PM
      expect(screen.getByText(/3:30/)).toBeInTheDocument();
    });

    it("should update date/time when component re-renders with different time", () => {
      const { rerender } = render(<PushEditor {...defaultProps} />);

      // Verify initial date/time
      expect(screen.getByText("Monday, January 15")).toBeInTheDocument();

      // Change system time and update mocks
      const newDate = new Date("2024-06-20T09:15:00.000Z");
      vi.setSystemTime(newDate);

      // Update the mocked return values for the new date
      vi.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue("Thursday, June 20");
      vi.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("11:15 AM");

      // Re-render component
      rerender(<PushEditor {...defaultProps} />);

      // Should display new date/time
      expect(screen.getByText("Thursday, June 20")).toBeInTheDocument();
      expect(screen.getByText(/11:15/)).toBeInTheDocument();
    });
  });

  describe("Editor Configuration", () => {
    it("should set immediatelyRender to false", () => {
      render(<PushEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-immediately-render", "false");
    });

    it("should handle empty content gracefully", () => {
      const emptyContent: TiptapDoc = { type: "doc", content: [] };
      render(<PushEditor {...defaultProps} content={emptyContent} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(screen.getByTestId("push-editor-content")).toBeInTheDocument();
    });

    it("should handle empty extensions array", () => {
      render(<PushEditor {...defaultProps} extensions={[]} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(screen.getByTestId("push-editor-content")).toBeInTheDocument();
    });
  });

  describe("TypeScript Interface Compliance", () => {
    it("should accept all required PushRenderProps", () => {
      const completeProps: PushRenderProps & { className?: string } = {
        content: mockContent,
        extensions: mockExtensions,
        editable: true,
        autofocus: true,
        onUpdate: vi.fn(),
        className: "test-class",
      };

      render(<PushEditor {...completeProps} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should work with minimal props", () => {
      const minimalProps: PushRenderProps = {
        content: mockContent,
        extensions: [],
        editable: false,
        autofocus: false,
        onUpdate: vi.fn(),
      };

      render(<PushEditor {...minimalProps} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should accept additional HTML div attributes", () => {
      const propsWithHtmlAttrs = {
        ...defaultProps,
        id: "push-editor-test",
        "data-custom": "value",
        role: "textbox",
      };

      render(<PushEditor {...propsWithHtmlAttrs} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle undefined content gracefully", () => {
      const propsWithUndefinedContent = {
        ...defaultProps,
        content: undefined as unknown as TiptapDoc,
      };

      render(<PushEditor {...propsWithUndefinedContent} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle null extensions gracefully", () => {
      const propsWithNullExtensions = {
        ...defaultProps,
        extensions: null as unknown as AnyExtension[],
      };

      render(<PushEditor {...propsWithNullExtensions} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle missing onUpdate callback", () => {
      const propsWithoutOnUpdate = {
        ...defaultProps,
        onUpdate: undefined as unknown as () => void,
      };

      render(<PushEditor {...propsWithoutOnUpdate} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Performance and Memoization", () => {
    it("should not re-render unnecessarily with same props", () => {
      const props = { ...defaultProps };
      const { rerender } = render(<PushEditor {...props} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();

      // Re-render with same props
      rerender(<PushEditor {...props} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle prop changes correctly", () => {
      const { rerender } = render(<PushEditor {...defaultProps} />);

      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-editable", "true");

      // Change props
      rerender(<PushEditor {...defaultProps} editable={false} />);

      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-editable", "false");
    });
  });

  describe("Read-Only Mode", () => {
    it("should render ReadOnlyEditorContent when readOnly is true", () => {
      render(<PushEditor {...defaultProps} readOnly={true} />);

      expect(screen.getByTestId("readonly-editor-content")).toBeInTheDocument();
      expect(screen.queryByTestId("bubble-text-menu")).not.toBeInTheDocument();
      expect(screen.queryByTestId("push-editor-content")).not.toBeInTheDocument();
    });

    it("should render PushEditorContent and BubbleTextMenu when readOnly is false", () => {
      render(<PushEditor {...defaultProps} readOnly={false} />);

      expect(screen.getByTestId("push-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });

    it("should default to editable mode when readOnly is not specified", () => {
      render(<PushEditor {...defaultProps} />);

      expect(screen.getByTestId("push-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });

    it("should set editor to not editable in read-only mode", () => {
      render(<PushEditor {...defaultProps} readOnly={true} />);

      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-editable", "false");
      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-autofocus", "false");
    });
  });
});
