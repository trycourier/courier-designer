import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnyExtension } from "@tiptap/react";
import type { TiptapDoc } from "@/lib/utils";

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
  }: {
    content?: TiptapDoc;
    extensions?: AnyExtension[];
    editable?: boolean;
    autofocus?: boolean;
    onUpdate?: ({ editor }: { editor: unknown }) => void;
    immediatelyRender?: boolean;
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="editor-provider"
      data-content={JSON.stringify(content)}
      data-extensions={extensions?.length || 0}
      data-editable={editable}
      data-autofocus={autofocus}
      data-immediate-render={immediatelyRender}
      data-on-update={!!onUpdate}
    >
      {children}
    </div>
  ),
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}));

// Mock IPhoneFrame
vi.mock("../../IPhoneFrame", () => ({
  IPhoneFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="iphone-frame">{children}</div>
  ),
}));

// Mock SMSEditorContent and SMSConfig
vi.mock("./SMS", () => ({
  SMSEditorContent: () => <div data-testid="sms-editor-content">SMS Editor Content</div>,
  SMSConfig: { variable: { state: "enabled" } },
  defaultSMSContent: [],
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

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" "),
}));

// Import component after mocks
import { SMSEditor } from "./SMSEditor";
import type { SMSEditorProps } from "./SMSEditor";

// Test data
const mockContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Test SMS content" }],
    },
  ],
} as const satisfies TiptapDoc;

const mockExtensions: AnyExtension[] = [
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  { name: "testExtension", type: "extension" } as AnyExtension,
];

const defaultProps = {
  content: mockContent,
  extensions: mockExtensions,
  editable: true,
  autofocus: true,
  onUpdate: mockOnUpdate,
} as const satisfies SMSEditorProps;

describe("SMSEditor Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render with all required props", () => {
      render(<SMSEditor {...defaultProps} />);

      expect(screen.getByTestId("iphone-frame")).toBeInTheDocument();
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(screen.getByTestId("sms-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
    });

    it("should render with custom className", () => {
      const { container } = render(<SMSEditor {...defaultProps} className="custom-class" />);

      const smsEditor = container.querySelector(".courier-sms-editor");
      expect(smsEditor).toHaveClass("courier-sms-editor", "custom-class");
    });

    it("should render without custom className", () => {
      const { container } = render(<SMSEditor {...defaultProps} />);

      const smsEditor = container.querySelector(".courier-sms-editor");
      expect(smsEditor).toHaveClass("courier-sms-editor");
      expect(smsEditor).not.toHaveClass("custom-class");
    });

    it("should render with additional HTML attributes", () => {
      // Note: SMSEditor component currently only uses specific props and doesn't spread rest
      // This test verifies TypeScript interface compliance rather than runtime behavior
      const props = {
        ...defaultProps,
        "data-testid": "custom-sms-editor",
        id: "sms-editor-id",
        role: "textbox" as const,
      };

      render(<SMSEditor {...props} />);

      // Verify component renders successfully with these props
      expect(screen.getByTestId("iphone-frame")).toBeInTheDocument();
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Props Handling", () => {
    it("should pass content prop to EditorProvider", () => {
      render(<SMSEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-content", JSON.stringify(mockContent));
    });

    it("should pass extensions prop to EditorProvider", () => {
      render(<SMSEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-extensions", "1");
    });

    it("should pass editable prop to EditorProvider", () => {
      render(<SMSEditor {...defaultProps} editable={false} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-editable", "false");
    });

    it("should pass autofocus prop to EditorProvider", () => {
      render(<SMSEditor {...defaultProps} autofocus={false} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-autofocus", "false");
    });

    it("should pass onUpdate prop to EditorProvider", () => {
      render(<SMSEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-on-update", "true");
    });

    it("should handle missing onUpdate prop", () => {
      const propsWithoutUpdate: Partial<SMSEditorProps> = { ...defaultProps };
      delete (propsWithoutUpdate as { onUpdate?: unknown }).onUpdate;

      render(<SMSEditor {...(propsWithoutUpdate as SMSEditorProps)} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-on-update", "false");
    });

    it("should set immediatelyRender to false", () => {
      render(<SMSEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-immediate-render", "false");
    });
  });

  describe("Component Integration", () => {
    it("should render IPhoneFrame as container", () => {
      render(<SMSEditor {...defaultProps} />);

      const iphoneFrame = screen.getByTestId("iphone-frame");
      expect(iphoneFrame).toBeInTheDocument();

      // Verify SMS editor is inside IPhoneFrame
      const smsEditor = iphoneFrame.querySelector(".courier-sms-editor");
      expect(smsEditor).toBeInTheDocument();
    });

    it("should render EditorProvider with correct configuration", () => {
      render(<SMSEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toBeInTheDocument();
      expect(editorProvider).toHaveAttribute("data-immediate-render", "false");
    });

    it("should render SMSEditorContent inside EditorProvider", () => {
      render(<SMSEditor {...defaultProps} />);

      const editorProvider = screen.getByTestId("editor-provider");
      const smsEditorContent = screen.getByTestId("sms-editor-content");

      expect(editorProvider).toContainElement(smsEditorContent);
      expect(smsEditorContent).toHaveTextContent("SMS Editor Content");
    });

    it("should render BubbleTextMenu with SMSConfig", () => {
      render(<SMSEditor {...defaultProps} />);

      const bubbleTextMenu = screen.getByTestId("bubble-text-menu");
      expect(bubbleTextMenu).toBeInTheDocument();
      expect(bubbleTextMenu).toHaveAttribute(
        "data-config",
        JSON.stringify({ variable: { state: "enabled" } })
      );
    });

    it("should have correct component hierarchy", () => {
      render(<SMSEditor {...defaultProps} />);

      const iphoneFrame = screen.getByTestId("iphone-frame");
      const editorProvider = screen.getByTestId("editor-provider");
      const smsEditorContent = screen.getByTestId("sms-editor-content");
      const bubbleTextMenu = screen.getByTestId("bubble-text-menu");

      // Verify hierarchy: IPhoneFrame > SMS Editor > EditorProvider > (SMSEditorContent + BubbleTextMenu)
      expect(iphoneFrame).toContainElement(editorProvider);
      expect(editorProvider).toContainElement(smsEditorContent);
      expect(editorProvider).toContainElement(bubbleTextMenu);
    });
  });

  describe("Styling and Layout", () => {
    it("should apply default SMS editor CSS class", () => {
      const { container } = render(<SMSEditor {...defaultProps} />);

      const smsEditor = container.querySelector(".courier-sms-editor");
      expect(smsEditor).toBeInTheDocument();
      expect(smsEditor).toHaveClass("courier-sms-editor");
    });

    it("should combine default and custom CSS classes", () => {
      const { container } = render(
        <SMSEditor {...defaultProps} className="custom-sms-class another-class" />
      );

      const smsEditor = container.querySelector(".courier-sms-editor");
      expect(smsEditor).toHaveClass("courier-sms-editor", "custom-sms-class", "another-class");
    });

    it("should handle undefined className", () => {
      const { container } = render(<SMSEditor {...defaultProps} className={undefined} />);

      const smsEditor = container.querySelector(".courier-sms-editor");
      expect(smsEditor).toHaveClass("courier-sms-editor");
    });

    it("should handle empty className", () => {
      const { container } = render(<SMSEditor {...defaultProps} className="" />);

      const smsEditor = container.querySelector(".courier-sms-editor");
      expect(smsEditor).toHaveClass("courier-sms-editor");
    });
  });

  describe("Content and Extensions", () => {
    it("should handle different content structures", () => {
      const customContent: TiptapDoc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              { type: "text", text: "world", marks: [{ type: "bold" }] },
            ],
          },
        ],
      };

      render(<SMSEditor {...defaultProps} content={customContent} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-content", JSON.stringify(customContent));
    });

    it("should handle empty extensions array", () => {
      render(<SMSEditor {...defaultProps} extensions={[]} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-extensions", "0");
    });

    it("should handle multiple extensions", () => {
      const multipleExtensions: AnyExtension[] = [
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        { name: "extension1", type: "extension" } as AnyExtension,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        { name: "extension2", type: "extension" } as AnyExtension,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        { name: "extension3", type: "extension" } as AnyExtension,
      ];

      render(<SMSEditor {...defaultProps} extensions={multipleExtensions} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-extensions", "3");
    });
  });

  describe("Editor States", () => {
    it("should handle editable=true state", () => {
      render(<SMSEditor {...defaultProps} editable={true} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-editable", "true");
    });

    it("should handle editable=false state", () => {
      render(<SMSEditor {...defaultProps} editable={false} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-editable", "false");
    });

    it("should handle autofocus=true state", () => {
      render(<SMSEditor {...defaultProps} autofocus={true} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-autofocus", "true");
    });

    it("should handle autofocus=false state", () => {
      render(<SMSEditor {...defaultProps} autofocus={false} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-autofocus", "false");
    });
  });

  describe("TypeScript Interface Compliance", () => {
    it("should accept all SMSRenderProps", () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const completeProps = {
        content: mockContent,
        extensions: mockExtensions,
        editable: true,
        autofocus: false,
        onUpdate: mockOnUpdate,
        className: "test-class",
        id: "test-id",
        role: "textbox",
        "data-testid": "test-sms-editor",
      } as SMSEditorProps & { "data-testid": string };

      const { container } = render(<SMSEditor {...completeProps} />);

      // Verify component renders and applies className (which is explicitly handled)
      const smsEditor = container.querySelector(".courier-sms-editor");
      expect(smsEditor).toHaveClass("test-class");
      expect(screen.getByTestId("iphone-frame")).toBeInTheDocument();
    });

    it("should work with minimal required props", () => {
      const minimalProps: SMSEditorProps = {
        content: mockContent,
        extensions: mockExtensions,
        editable: true,
        autofocus: true,
        onUpdate: mockOnUpdate,
      };

      render(<SMSEditor {...minimalProps} />);

      expect(screen.getByTestId("iphone-frame")).toBeInTheDocument();
    });

    it("should exclude content from HTMLAttributes", () => {
      // This test verifies TypeScript interface compliance
      // The content prop should come from SMSRenderProps, not HTMLAttributes
      const props: SMSEditorProps = {
        content: mockContent,
        extensions: mockExtensions,
        editable: true,
        autofocus: true,
        onUpdate: mockOnUpdate,
        // content: "string" // This should cause TypeScript error if uncommented
      };

      render(<SMSEditor {...props} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Performance and Memoization", () => {
    it("should re-render when props change", () => {
      const { rerender } = render(<SMSEditor {...defaultProps} editable={true} />);

      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-editable", "true");

      rerender(<SMSEditor {...defaultProps} editable={false} />);

      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-editable", "false");
    });

    it("should handle rapid prop changes", () => {
      const { rerender } = render(<SMSEditor {...defaultProps} />);

      // Multiple rapid re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<SMSEditor {...defaultProps} editable={i % 2 === 0} />);
      }

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle undefined content", () => {
      render(<SMSEditor {...defaultProps} content={undefined as unknown as TiptapDoc} />);

      const editorProvider = screen.getByTestId("editor-provider");
      // When content is undefined, a default value is provided
      expect(editorProvider).toHaveAttribute("data-content");
      expect(editorProvider).toHaveAttribute(
        "data-content",
        '{"type":"doc","content":[{"type":"paragraph"}]}'
      );
    });

    it("should handle undefined extensions", () => {
      render(<SMSEditor {...defaultProps} extensions={undefined as unknown as AnyExtension[]} />);

      const editorProvider = screen.getByTestId("editor-provider");
      expect(editorProvider).toHaveAttribute("data-extensions", "0");
    });
  });

  describe("Read-Only Mode", () => {
    it("should render ReadOnlyEditorContent when readOnly is true", () => {
      render(<SMSEditor {...defaultProps} readOnly={true} />);

      expect(screen.getByTestId("readonly-editor-content")).toBeInTheDocument();
      expect(screen.queryByTestId("bubble-text-menu")).not.toBeInTheDocument();
      expect(screen.queryByTestId("sms-editor-content")).not.toBeInTheDocument();
    });

    it("should render SMSEditorContent and BubbleTextMenu when readOnly is false", () => {
      render(<SMSEditor {...defaultProps} readOnly={false} />);

      expect(screen.getByTestId("sms-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });

    it("should default to editable mode when readOnly is not specified", () => {
      render(<SMSEditor {...defaultProps} />);

      expect(screen.getByTestId("sms-editor-content")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("readonly-editor-content")).not.toBeInTheDocument();
    });

    it("should set editor to not editable in read-only mode", () => {
      render(<SMSEditor {...defaultProps} readOnly={true} />);

      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-editable", "false");
      expect(screen.getByTestId("editor-provider")).toHaveAttribute("data-autofocus", "false");
    });
  });
});
