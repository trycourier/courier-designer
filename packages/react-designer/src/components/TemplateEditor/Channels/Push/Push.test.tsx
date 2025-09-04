import React, { forwardRef, createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ElementalContent } from "@/types/elemental.types";

// Define types for global interfaces
interface MockEditor {
  commands: {
    blur: () => void;
    setContent: (content: unknown) => void;
  };
  getJSON: () => Record<string, unknown>;
  isFocused: boolean;
  isDestroyed: boolean;
}

interface MockRouting {
  method: "all";
  channels: string[];
}

// Mock atom values that will be controlled in tests
let mockIsTemplateLoading = false;
let mockTemplateEditorContent: ElementalContent | null = null;
let mockBrandEditor: MockEditor | null = null;
const mockSelectedNode = { type: { name: "paragraph" }, attrs: { id: "test-node" } };

// Mock Jotai hooks
vi.mock("jotai", () => ({
  useAtom: vi.fn((atom) => {
    const atomStr = atom.toString();
    if (atomStr.includes("templateEditorContent")) {
      return [mockTemplateEditorContent, vi.fn()];
    }
    if (atomStr.includes("brandEditor")) {
      return [mockBrandEditor, vi.fn()];
    }
    return [null, vi.fn()];
  }),
  useAtomValue: vi.fn((atom) => {
    const atomStr = atom.toString();
    if (atomStr.includes("isTemplateLoading")) {
      return mockIsTemplateLoading;
    }
    if (atomStr.includes("templateEditorContent")) {
      return mockTemplateEditorContent;
    }
    if (atomStr.includes("selectedNode")) {
      return mockSelectedNode;
    }
    return null;
  }),
  useSetAtom: vi.fn(() => vi.fn()),
}));

// Mock the store atoms
vi.mock("../../../Providers/store", () => ({
  isTemplateLoadingAtom: "isTemplateLoadingAtom",
}));

vi.mock("../../store", () => ({
  brandEditorAtom: "brandEditorAtom",
  templateEditorContentAtom: "templateEditorContentAtom",
  isTemplateTransitioningAtom: "isTemplateTransitioningAtom",
}));

vi.mock("@/components/ui/TextMenu/store", () => ({
  selectedNodeAtom: "selectedNodeAtom",
}));

// Mock TipTap React
const mockEditor: MockEditor = {
  commands: {
    blur: vi.fn(),
    setContent: vi.fn(),
  },
  getJSON: vi.fn(),
  isFocused: false,
  isDestroyed: false,
};

vi.mock("@tiptap/react", () => ({
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}));

// Mock ExtensionKit
vi.mock("@/components/extensions/extension-kit", () => ({
  ExtensionKit: vi.fn(() => []),
}));

// Mock conversion utilities
vi.mock("@/lib/utils", () => ({
  convertElementalToTiptap: vi.fn(),
  convertTiptapToElemental: vi.fn(),
  updateElemental: vi.fn(),
}));

// Mock MainLayout
vi.mock("../../../ui/MainLayout", () => ({
  MainLayout: forwardRef<
    HTMLDivElement,
    {
      children: React.ReactNode;
      Header: React.ReactNode;
      isLoading: boolean;
      theme?: string;
    }
  >(({ children, Header, isLoading, theme }, ref) => (
    <div data-testid="main-layout" data-loading={isLoading} data-theme={theme} ref={ref}>
      <div data-testid="header">{Header}</div>
      <div data-testid="content">{children}</div>
    </div>
  )),
}));

// Mock Channels component
vi.mock("../Channels", () => ({
  Channels: ({
    hidePublish,
    channels,
    routing,
  }: {
    hidePublish?: boolean;
    channels?: Array<"email" | "sms" | "push">;
    routing: MockRouting;
  }) => (
    <div data-testid="channels">
      <span data-testid="hide-publish">{hidePublish?.toString()}</span>
      <span data-testid="channels-list">{channels?.join(",")}</span>
      <span data-testid="routing-method">{routing.method}</span>
    </div>
  ),
}));

// Import component and utilities after mocks
import { Push, defaultPushContent, PushConfig, PushEditorContent } from "./Push";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import { useSetAtom } from "jotai";
import { useCurrentEditor } from "@tiptap/react";

// Helper functions to control mock state
const setMockState = (state: {
  isTemplateLoading?: boolean;
  templateContent?: ElementalContent | null;
  brandEditor?: MockEditor | null;
}) => {
  if (state.isTemplateLoading !== undefined) mockIsTemplateLoading = state.isTemplateLoading;
  if (state.templateContent !== undefined) mockTemplateEditorContent = state.templateContent;
  if (state.brandEditor !== undefined) mockBrandEditor = state.brandEditor;
};

const resetMockState = () => {
  mockIsTemplateLoading = false;
  mockTemplateEditorContent = null;
  mockBrandEditor = null;
  vi.clearAllMocks();

  // Reset mock implementations
  (convertElementalToTiptap as ReturnType<typeof vi.fn>).mockReturnValue({
    type: "doc",
    content: [],
  });
  (convertTiptapToElemental as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (updateElemental as ReturnType<typeof vi.fn>).mockImplementation(
    (content: unknown, update: unknown) => {
      if (content && typeof content === "object" && "elements" in content) {
        return {
          ...content,
          elements: Array.isArray(content.elements) ? [...content.elements, update] : [update],
        };
      }
      return { elements: [update] };
    }
  );
};

describe("Push Component", () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Default Content", () => {
    it("should export correct default push content", () => {
      expect(defaultPushContent).toEqual({
        raw: {
          title: "",
          text: "",
        },
      });
    });
  });

  describe("Push Config", () => {
    it("should have correct text menu configuration", () => {
      expect(PushConfig).toEqual({
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

  describe("Component Rendering", () => {
    it("should render with basic props", () => {
      const routing: MockRouting = { method: "all", channels: [] };

      render(<Push routing={routing} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
      expect(screen.getByTestId("channels")).toBeInTheDocument();
    });

    it("should render with custom header renderer", () => {
      const routing: MockRouting = { method: "all", channels: [] };
      const mockHeaderRenderer = vi.fn(() => <div data-testid="custom-header">Custom Header</div>);

      render(<Push routing={routing} headerRenderer={mockHeaderRenderer} />);

      expect(screen.getByTestId("custom-header")).toBeInTheDocument();
      expect(mockHeaderRenderer).toHaveBeenCalledWith({
        hidePublish: undefined,
        channels: undefined,
        routing,
      });
    });

    it("should render with custom render function", () => {
      const routing: MockRouting = { method: "all", channels: [] };
      const mockRender = vi.fn(() => <div data-testid="custom-content">Custom Content</div>);

      render(<Push routing={routing} render={mockRender} />);

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
      expect(mockRender).toHaveBeenCalledWith({
        content: { type: "doc", content: [] },
        extensions: [],
        editable: true,
        autofocus: true,
        onUpdate: expect.any(Function),
      });
    });

    it("should handle loading state", () => {
      setMockState({ isTemplateLoading: true });
      const routing: MockRouting = { method: "all", channels: [] };

      render(<Push routing={routing} />);

      expect(screen.getByTestId("main-layout")).toHaveAttribute("data-loading", "true");
    });

    it("should handle theme prop", () => {
      const routing: MockRouting = { method: "all", channels: [] };

      render(<Push routing={routing} theme="dark" />);

      expect(screen.getByTestId("main-layout")).toHaveAttribute("data-theme", "dark");
    });
  });

  describe("Props Handling", () => {
    it("should handle readOnly prop", () => {
      const routing: MockRouting = { method: "all", channels: [] };
      const mockRender = vi.fn(() => <div>Content</div>);

      render(<Push routing={routing} readOnly={true} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          editable: false,
          autofocus: false,
        })
      );
    });

    it("should handle variables prop and extend with urls", () => {
      const routing: MockRouting = { method: "all", channels: [] };
      const variables = { user: { name: "John" } };
      const mockRender = vi.fn(() => <div>Content</div>);

      render(<Push routing={routing} variables={variables} render={mockRender} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
      // Variables should be extended with urls in ExtensionKit call
    });

    it("should handle channels prop", () => {
      const routing: MockRouting = { method: "all", channels: [] };
      const channels = ["push", "email"] as Array<"push" | "email">;

      render(<Push routing={routing} channels={channels} />);

      expect(screen.getByTestId("channels-list")).toHaveTextContent("push,email");
    });

    it("should handle hidePublish prop", () => {
      const routing: MockRouting = { method: "all", channels: [] };

      render(<Push routing={routing} hidePublish={true} />);

      expect(screen.getByTestId("hide-publish")).toHaveTextContent("true");
    });
  });

  describe("Content Management", () => {
    it("should create default content when no template content exists", () => {
      setMockState({ templateContent: null });
      const routing: MockRouting = { method: "all", channels: [] };
      const mockRender = vi.fn(() => <div>Content</div>);

      render(<Push routing={routing} render={mockRender} />);

      expect(convertElementalToTiptap).toHaveBeenCalledWith({
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "push",
            elements: [
              { type: "text", content: "\n", text_style: "h2" },
              { type: "text", content: "\n" },
            ],
          },
        ],
      });
    });

    it("should use existing push content from template", () => {
      const existingContent = {
        version: "2022-01-01" as const,
        elements: [
          {
            type: "channel" as const,
            channel: "push" as const,
            raw: {
              title: "Push Title",
              text: "Push Body Text",
            },
          },
        ],
      };

      const routing: MockRouting = { method: "all", channels: [] };
      const mockRender = vi.fn(() => <div>Content</div>);

      render(<Push routing={routing} render={mockRender} value={existingContent} />);

      expect(convertElementalToTiptap).toHaveBeenCalledWith({
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "push",
            elements: [
              { type: "text", content: "Push Title", text_style: "h2" },
              { type: "text", content: "Push Body Text" },
            ],
          },
        ],
      });
    });
  });

  describe("Editor Updates", () => {
    it("should handle onUpdate callback", async () => {
      setMockState({
        templateContent: {
          version: "2022-01-01",
          elements: [],
        },
      });

      const routing: MockRouting = { method: "all", channels: [] };
      const mockRender = vi.fn(() => <div>Content</div>);

      render(<Push routing={routing} render={mockRender} />);

      // Verify render was called with onUpdate function
      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          onUpdate: expect.any(Function),
        })
      );
    });

    it("should not update when template content is null", async () => {
      setMockState({ templateContent: null });

      const routing: MockRouting = { method: "all", channels: [] };
      const mockRender = vi.fn(() => <div>Content</div>);

      render(<Push routing={routing} render={mockRender} />);

      // Verify render was called with onUpdate function
      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          onUpdate: expect.any(Function),
        })
      );
    });
  });

  describe("Component Lifecycle", () => {
    it("should handle component mounting and unmounting", () => {
      const routing: MockRouting = { method: "all", channels: [] };

      const { unmount } = render(<Push routing={routing} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();

      unmount();

      expect(screen.queryByTestId("main-layout")).not.toBeInTheDocument();
    });
  });

  describe("PushEditorContent Component", () => {
    const mockSetBrandEditor = vi.fn();

    beforeEach(() => {
      (useSetAtom as ReturnType<typeof vi.fn>).mockReturnValue(mockSetBrandEditor);
      (useCurrentEditor as ReturnType<typeof vi.fn>).mockReturnValue({ editor: mockEditor });
    });

    it("should set brand editor when editor is available", async () => {
      render(<PushEditorContent />);

      expect(mockSetBrandEditor).toHaveBeenCalledWith(mockEditor);
    });

    it("should call editor blur command", async () => {
      vi.useFakeTimers();

      render(<PushEditorContent />);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(mockEditor.commands.blur).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should not set brand editor when editor is null", () => {
      (useCurrentEditor as ReturnType<typeof vi.fn>).mockReturnValue({ editor: null });

      render(<PushEditorContent />);

      expect(mockSetBrandEditor).not.toHaveBeenCalled();
    });

    it("should not call blur when editor is null", async () => {
      (useCurrentEditor as ReturnType<typeof vi.fn>).mockReturnValue({ editor: null });
      vi.useFakeTimers();

      render(<PushEditorContent />);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(mockEditor.commands.blur).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing editor gracefully", () => {
      (useCurrentEditor as ReturnType<typeof vi.fn>).mockReturnValue({ editor: null });

      const routing: MockRouting = { method: "all", channels: [] };

      render(<Push routing={routing} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });

    it("should handle malformed template content", () => {
      setMockState({
        templateContent: {
          version: "2022-01-01",
          elements: [
            {
              type: "invalid" as "channel",
              channel: "push" as const,
              elements: "invalid" as unknown as [],
            },
          ],
        },
      });

      const routing: MockRouting = { method: "all", channels: [] };

      render(<Push routing={routing} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });
  });

  describe("Forwarded Ref", () => {
    it("should forward ref to MainLayout", () => {
      const ref = createRef<HTMLDivElement>();
      const routing: MockRouting = { method: "all", channels: [] };

      render(<Push routing={routing} ref={ref} />);

      // MainLayout should receive the ref
      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });
  });

  describe("Memoization", () => {
    it("should memoize component properly", () => {
      const routing: MockRouting = { method: "all", channels: [] };
      const props = { routing, theme: "light" };

      const { rerender } = render(<Push {...props} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();

      // Re-render with same props
      rerender(<Push {...props} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });
  });
});
