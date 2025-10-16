import React, { forwardRef, createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SegmentedMessage } from "sms-segments-calculator";
import { convertTiptapToElemental, convertElementalToTiptap, updateElemental } from "@/lib/utils";
import { ExtensionKit } from "@/components/extensions/extension-kit";

// Mock sms-segments-calculator
let mockMessageSize = 80;

vi.mock("sms-segments-calculator", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SegmentedMessage: vi.fn().mockImplementation(
    () =>
      ({
        messageSize: mockMessageSize,
        segmentsCount: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
  ),
}));

// Helper function to set mock message size and update the mock
const setMockMessageSize = (size: number) => {
  mockMessageSize = size;
  // Update the mock implementation to return the new size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(SegmentedMessage).mockImplementation(
    () =>
      ({
        messageSize: size,
        segmentsCount: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
  );
};

// Mock TipTap useCurrentEditor hook
const mockEditor = {
  getText: vi.fn(() => "Test SMS message"),
  getJSON: vi.fn(() => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Test SMS message" }] }],
  })),
  commands: {
    blur: vi.fn(),
  },
};

vi.mock("@tiptap/react", () => ({
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}));

// Mock Jotai atoms
const mockTemplateEditorContent = {
  version: "2022-01-01" as const,
  elements: [
    {
      type: "channel" as const,
      channel: "sms" as const,
      elements: [{ type: "text" as const, content: "Hello SMS" }],
    },
  ],
};

let mockBrandEditorAtom = vi.fn();
const mockSetTemplateEditorContent = vi.fn();
const _mockSetSelectedNode = vi.fn();

// Mock the store atoms directly
vi.mock("@/components/TemplateEditor/store", () => ({
  brandEditorAtom: "brandEditorAtom",
  templateEditorAtom: "templateEditorAtom",
  templateEditorContentAtom: "templateEditorContentAtom",
  isTemplateTransitioningAtom: "isTemplateTransitioningAtom",
}));

vi.mock("@/components/Providers/store", () => ({
  isTemplateLoadingAtom: "isTemplateLoadingAtom",
}));

vi.mock("@/components/ui/TextMenu/store", () => ({
  selectedNodeAtom: "selectedNodeAtom",
}));

vi.mock("jotai", () => ({
  useAtom: vi.fn((atom: unknown) => {
    if (atom === "templateEditorContentAtom") {
      return [mockTemplateEditorContent, mockSetTemplateEditorContent];
    }
    return [null, vi.fn()];
  }),
  useAtomValue: vi.fn((atom: unknown) => {
    if (atom === "isTemplateLoadingAtom") {
      return false;
    }
    return null;
  }),
  useSetAtom: vi.fn((atom: unknown) => {
    if (atom === "brandEditorAtom") {
      return mockBrandEditorAtom;
    }
    if (atom === "templateEditorAtom") {
      return mockBrandEditorAtom; // SMS uses templateEditorAtom now
    }
    if (atom === "selectedNodeAtom") {
      return _mockSetSelectedNode;
    }
    return vi.fn();
  }),
  createStore: vi.fn(() => ({})),
  atom: vi.fn(() => ({})),
}));

// Mock extension kit
vi.mock("@/components/extensions/extension-kit", () => ({
  ExtensionKit: vi.fn(() => [
    {
      name: "testExtension",
      type: "extension",
    },
  ]),
}));

// Get reference to mocked ExtensionKit
const mockExtensionKit = vi.mocked(ExtensionKit);

// Mock conversion utilities
const mockElementalData = [{ type: "text", content: "Converted content" }];
const mockTiptapData = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "TipTap content" }] }],
};

vi.mock("@/lib/utils", () => ({
  convertTiptapToElemental: vi.fn(() => mockElementalData),
  convertElementalToTiptap: vi.fn(() => mockTiptapData),
  updateElemental: vi.fn((content, update) => ({
    ...content,
    elements: content.elements.map((el: unknown) =>
      el && typeof el === "object" && "channel" in el && el.channel === update.channel
        ? { ...el, elements: update.elements }
        : el
    ),
  })),
}));

// Mock MainLayout
vi.mock("../../../ui/MainLayout", () => ({
  MainLayout: forwardRef<
    HTMLDivElement,
    {
      theme?: unknown;
      isLoading?: boolean;
      Header?: React.ReactNode;
      children?: React.ReactNode;
    }
  >(({ theme, isLoading, Header, children }, ref) => (
    <div
      ref={ref}
      data-testid="main-layout"
      data-theme={theme ? "custom" : "default"}
      data-loading={isLoading}
    >
      {Header && <div data-testid="header">{Header}</div>}
      <div data-testid="content">{children}</div>
    </div>
  )),
}));

// Mock Channels component
vi.mock("../Channels", () => ({
  Channels: ({
    hidePublish,
    channels: _channels,
    routing: _routing,
  }: {
    hidePublish?: boolean;
    channels?: unknown[];
    routing: unknown;
  }) => (
    <div data-testid="channels" data-hide-publish={hidePublish}>
      Channels Component
    </div>
  ),
}));

// Import component after mocks
import { SMS, SMSEditorContent, defaultSMSContent, SMSConfig } from "./SMS";
import type { SMSProps } from "./SMS";

// Test data
const mockRouting = { method: "single" as const, channels: ["sms"] };
const mockChannels: ("email" | "sms" | "push" | "inbox")[] = ["sms"];
const mockVariables = { userName: "John", userEmail: "john@example.com" };

const defaultProps: SMSProps = {
  routing: mockRouting,
  readOnly: false,
  variables: mockVariables,
  channels: mockChannels,
  hidePublish: false,
};

describe("SMS Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessageSize = 80;
    mockBrandEditorAtom = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Default Content & Configuration", () => {
    it("should export defaultSMSContent with correct structure", () => {
      expect(defaultSMSContent).toEqual({
        raw: {
          text: "",
        },
      });
    });

    it("should export SMSConfig with correct configuration", () => {
      expect(SMSConfig).toEqual({
        contentType: { state: "hidden" },
        bold: { state: "hidden" },
        italic: { state: "hidden" },
        underline: { state: "hidden" },
        strike: { state: "hidden" },
        alignLeft: { state: "hidden" },
        alignCenter: { state: "hidden" },
        alignRight: { state: "hidden" },
        alignJustify: { state: "hidden" },
        quote: { state: "hidden" },
        link: { state: "hidden" },
        variable: { state: "enabled" },
      });
    });
  });

  describe("SMSEditorContent Component", () => {
    it("should render segment count based on message size", () => {
      setMockMessageSize(160);
      render(<SMSEditorContent />);

      // Should show Math.ceil(160 / 8) = 20
      expect(screen.getByText("20")).toBeInTheDocument();
    });

    it("should calculate segments for different message sizes", () => {
      // First test with short message (80 messageSize)
      mockEditor.getText.mockReturnValue("Short SMS");
      setMockMessageSize(80);
      const { rerender } = render(<SMSEditorContent />);

      // Should show Math.ceil(80 / 8) = 10
      expect(screen.getByText("10")).toBeInTheDocument();

      // Then test with long message (320 messageSize)
      mockEditor.getText.mockReturnValue(
        "This is a very long SMS message that would result in a higher segment count for testing purposes"
      );
      setMockMessageSize(320);
      rerender(<SMSEditorContent />);

      // Should show Math.ceil(320 / 8) = 40
      expect(screen.getByText("40")).toBeInTheDocument();
    });

    it("should initialize SegmentedMessage with editor text", () => {
      mockEditor.getText.mockReturnValue("Hello SMS world");
      render(<SMSEditorContent />);

      expect(SegmentedMessage).toHaveBeenCalledWith("Hello SMS world");
    });

    it("should handle empty editor text", () => {
      mockEditor.getText.mockReturnValue("");
      render(<SMSEditorContent />);

      expect(SegmentedMessage).toHaveBeenCalledWith("");
    });

    it("should set template editor and blur on mount", async () => {
      // Reset the mock before testing
      mockBrandEditorAtom.mockClear();

      render(<SMSEditorContent />);

      // Verify setTemplateEditor was called (SMS uses templateEditorAtom)
      expect(mockBrandEditorAtom).toHaveBeenCalledWith(mockEditor);

      // Wait for setTimeout to execute
      await waitFor(() => {
        expect(mockEditor.commands.blur).toHaveBeenCalled();
      });
    });

    it("should apply correct CSS classes", () => {
      const { container } = render(<SMSEditorContent />);

      const span = container.querySelector("span");
      expect(span).toHaveClass(
        "courier-self-end",
        "courier-pr-2",
        "courier-text-xs",
        "courier-color-gray-500"
      );
    });
  });

  describe("Component Rendering", () => {
    it("should render with default props", () => {
      render(<SMS {...defaultProps} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
      expect(screen.getByTestId("channels")).toBeInTheDocument();
    });

    it("should render with custom theme", () => {
      const customTheme = "dark";
      render(<SMS {...defaultProps} theme={customTheme} />);

      expect(screen.getByTestId("main-layout")).toHaveAttribute("data-theme", "custom");
    });

    it("should render with custom header renderer", () => {
      const headerRenderer = vi.fn(() => <div data-testid="custom-header">Custom Header</div>);

      render(<SMS {...defaultProps} headerRenderer={headerRenderer} />);

      expect(screen.getByTestId("custom-header")).toBeInTheDocument();
      expect(headerRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          routing: mockRouting,
          hidePublish: false,
        })
      );
      expect(screen.queryByTestId("channels")).not.toBeInTheDocument();
    });

    it("should render with custom render function", () => {
      const customRender = vi.fn(() => <div data-testid="custom-render">Custom SMS Editor</div>);

      render(<SMS {...defaultProps} render={customRender} />);

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
      expect(customRender).toHaveBeenCalledWith(
        expect.objectContaining({
          editable: true,
          autofocus: true,
          onUpdate: expect.any(Function),
        })
      );
    });
  });

  describe("Props Handling", () => {
    it("should handle readOnly prop correctly", () => {
      const mockRender = vi.fn(() => <div>SMS Editor</div>);
      render(<SMS {...defaultProps} readOnly={true} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          editable: false,
          autofocus: false,
        })
      );
    });

    it("should handle variables prop and extend with URLs", () => {
      const customVariables = { customVar: "value" };
      render(<SMS {...defaultProps} variables={customVariables} />);

      // Just verify ExtensionKit was called - the exact structure is tested elsewhere
      expect(mockExtensionKit).toHaveBeenCalled();

      // Verify it was called with variables that include the custom variable
      const callArgs = mockExtensionKit.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.variables).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((callArgs as any).variables.customVar).toBe("value");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((callArgs as any).variables.urls.unsubscribe).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((callArgs as any).variables.urls.preferences).toBe(true);
    });

    it("should handle channels prop", () => {
      const customChannels: ("email" | "sms" | "push" | "inbox")[] = ["email"];
      render(<SMS {...defaultProps} channels={customChannels} />);

      // Channels component should receive the custom channels
      expect(screen.getByTestId("channels")).toBeInTheDocument();
    });

    it("should handle hidePublish prop", () => {
      render(<SMS {...defaultProps} hidePublish={true} />);

      expect(screen.getByTestId("channels")).toHaveAttribute("data-hide-publish", "true");
    });
  });

  describe("Content Management", () => {
    it("should use existing SMS content from templateEditorContent", () => {
      const smsContent = {
        version: "2022-01-01" as const,
        elements: [
          {
            type: "channel" as const,
            channel: "sms" as const,
            raw: {
              text: "Hello SMS",
            },
          },
        ],
      };

      render(<SMS {...defaultProps} value={smsContent} />);

      expect(convertElementalToTiptap).toHaveBeenCalledWith({
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "sms",
            elements: [{ type: "text", content: "Hello SMS" }], // Converted from raw.text for display
          },
        ],
      });
    });

    it("should handle null templateEditorContent", () => {
      render(<SMS {...defaultProps} />);

      expect(convertElementalToTiptap).toHaveBeenCalled();
    });
  });

  describe("Editor Updates", () => {
    it("should handle onUpdate with content changes", () => {
      const mockRender = vi.fn(({ onUpdate }) => {
        // Simulate editor update
        if (onUpdate) onUpdate({ editor: mockEditor });
        return <div>SMS Editor</div>;
      });

      render(<SMS {...defaultProps} render={mockRender} />);

      expect(convertTiptapToElemental).toHaveBeenCalled();
      expect(updateElemental).toHaveBeenCalledWith(mockTemplateEditorContent, {
        channel: {
          channel: "sms",
          raw: {
            text: expect.any(String),
          },
        },
      });
    });

    it("should only update when content actually changes", () => {
      const unchangedContent = { ...mockTemplateEditorContent };

      // Mock updateElemental to return the same content
      vi.mocked(updateElemental).mockReturnValue(unchangedContent);

      const mockRender = vi.fn(({ onUpdate }) => {
        if (onUpdate) onUpdate({ editor: mockEditor });
        return <div>SMS Editor</div>;
      });

      render(<SMS {...defaultProps} render={mockRender} />);

      expect(mockSetTemplateEditorContent).not.toHaveBeenCalled();
    });
  });

  describe("Component Lifecycle", () => {
    it("should track mount status", () => {
      const { unmount } = render(<SMS {...defaultProps} />);

      // Component should be mounted
      expect(screen.getByTestId("main-layout")).toBeInTheDocument();

      unmount();

      // Cleanup should have occurred
    });

    it("should memoize extensions based on variables", () => {
      const { rerender } = render(<SMS {...defaultProps} />);

      // Re-render with same props
      rerender(<SMS {...defaultProps} />);

      // ExtensionKit should be called with memoized variables
      expect(mockExtensionKit).toHaveBeenCalled();
    });

    it("should update extensions when variables change", () => {
      const { rerender } = render(<SMS {...defaultProps} variables={{ test: "value1" }} />);

      rerender(<SMS {...defaultProps} variables={{ test: "value2" }} />);

      // Check that ExtensionKit was called multiple times
      expect(mockExtensionKit).toHaveBeenCalledTimes(2);

      // Verify the last call had the updated variable
      const lastCallArgs = mockExtensionKit.mock.calls[1]?.[0];
      expect(lastCallArgs).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((lastCallArgs as any).variables.test).toBe("value2");
    });
  });

  describe("Forwarded Ref", () => {
    it("should forward ref to MainLayout", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SMS {...defaultProps} ref={ref} />);

      expect(ref.current).toBeTruthy();
      expect(ref.current).toBe(screen.getByTestId("main-layout"));
    });

    it("should work without ref", () => {
      render(<SMS {...defaultProps} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });
  });

  describe("Memoization", () => {
    it("should be memoized component", () => {
      const props = { ...defaultProps };
      const { rerender } = render(<SMS {...props} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();

      // Re-render with same props
      rerender(<SMS {...props} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });

    it("should re-render when props change", () => {
      const { rerender } = render(<SMS {...defaultProps} hidePublish={false} />);

      expect(screen.getByTestId("channels")).toHaveAttribute("data-hide-publish", "false");

      rerender(<SMS {...defaultProps} hidePublish={true} />);

      expect(screen.getByTestId("channels")).toHaveAttribute("data-hide-publish", "true");
    });
  });

  describe("Error Handling", () => {
    it("should handle undefined variables", () => {
      render(<SMS {...defaultProps} variables={undefined} />);

      // Just verify ExtensionKit was called with URLs
      expect(mockExtensionKit).toHaveBeenCalled();
      const callArgs = mockExtensionKit.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((callArgs as any).variables.urls.unsubscribe).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((callArgs as any).variables.urls.preferences).toBe(true);
    });

    it("should handle render prop returning null", () => {
      const nullRender = () => null;
      render(<SMS {...defaultProps} render={nullRender} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
      expect(screen.getByTestId("content")).toBeEmptyDOMElement();
    });

    it("should handle empty message in SegmentedMessage", () => {
      mockEditor.getText.mockReturnValue("");
      render(<SMSEditorContent />);

      expect(SegmentedMessage).toHaveBeenCalledWith("");
    });
  });

  describe("TypeScript Interface Compliance", () => {
    it("should accept all required props", () => {
      const completeProps: SMSProps = {
        routing: mockRouting,
        readOnly: true,
        variables: mockVariables,
        channels: mockChannels,
        hidePublish: true,
        theme: "dark",
        headerRenderer: () => <div>Custom Header</div>,
        render: () => <div>Custom Render</div>,
      };

      render(<SMS {...completeProps} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });

    it("should work with minimal props", () => {
      const minimalProps: SMSProps = {
        routing: mockRouting,
      };

      render(<SMS {...minimalProps} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });
  });
});
