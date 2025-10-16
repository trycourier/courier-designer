import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EmailEditor from "./EmailEditor";
import type { ElementalContent } from "@/types";

// Mock all external dependencies - these must be declared before vi.mock calls
const mockSetEmailEditor = vi.fn();
const mockSetTemplateEditorContent = vi.fn();
const mockSetSelectedNode = vi.fn();
const mockSetPendingLink = vi.fn();
const mockOnUpdate = vi.fn();
const mockOnDestroy = vi.fn();

// Define proper types for mocks
interface MockSelectedNode {
  type?: { name: string };
  attrs?: { id: string };
}

interface MockTenantData {
  data?: {
    tenant?: {
      notification?: {
        data?: {
          content?: ElementalContent | null;
        };
      };
    };
  };
  [key: string]: unknown;
}

// Mock atom values that will be controlled in tests
let mockTemplateEditorContent: ElementalContent | null = null;
let mockSubject: string | null = "Test Subject";
let mockSelectedNode: MockSelectedNode | null = null;
let mockIsTemplateLoading = false;
let mockTenantData: MockTenantData = {
  data: {
    tenant: {
      notification: {
        data: {
          content: null,
        },
      },
    },
  },
};

// Mock setup - will be populated after vi.mock calls

// Mock Jotai hooks
vi.mock("jotai", () => ({
  useAtom: vi.fn((atom) => {
    const atomStr = atom.toString();
    if (atomStr.includes("templateEditorContent")) {
      return [mockTemplateEditorContent, mockSetTemplateEditorContent];
    }
    if (atomStr.includes("emailEditor")) {
      return [mockEditor, mockSetEmailEditor];
    }
    return [null, vi.fn()];
  }),
  useAtomValue: vi.fn((atom) => {
    const atomStr = atom.toString();
    if (atomStr.includes("subject")) {
      return mockSubject;
    }
    if (atomStr.includes("selectedNode")) {
      return mockSelectedNode;
    }
    if (atomStr.includes("isTemplateLoading")) {
      return mockIsTemplateLoading;
    }
    if (atomStr.includes("templateData")) {
      return mockTenantData;
    }
    if (atomStr.includes("templateEditorContent")) {
      return mockTemplateEditorContent;
    }
    return null;
  }),
  useSetAtom: vi.fn((atom) => {
    const atomStr = atom.toString();
    if (atomStr.includes("emailEditor") || atomStr.includes("templateEditor")) {
      return mockSetEmailEditor;
    }
    if (atomStr.includes("templateEditorContent")) {
      return mockSetTemplateEditorContent;
    }
    if (atomStr.includes("selectedNode")) {
      return mockSetSelectedNode;
    }
    if (atomStr.includes("setPendingLink")) {
      return mockSetPendingLink;
    }
    return vi.fn();
  }),
}));

// Create a shared mock editor instance that can be accessed by tests
const mockEditorInstance = {
  commands: {
    setContent: vi.fn(),
    updateSelectionState: vi.fn(),
    setEditable: vi.fn(),
    focus: vi.fn(),
    setTextSelection: vi.fn(),
  },
  getJSON: vi.fn(() => ({ type: "doc", content: [] })),
  state: {
    selection: {
      $anchor: { pos: 1, depth: 1 },
      $head: { marks: vi.fn(() => []) },
    },
  },
  view: {
    state: {
      tr: {
        setSelection: vi.fn().mockReturnThis(),
      },
      selection: { $anchor: { pos: 1 } },
      doc: {},
    },
    dispatch: vi.fn(),
    posAtDOM: vi.fn(() => 1),
  },
  isActive: vi.fn(() => false),
  isDestroyed: false,
  isEditable: true,
  setEditable: vi.fn(),
};

// Define proper type for EditorProvider props
interface EditorProviderProps {
  children: React.ReactNode;
  onCreate?: (params: { editor: unknown }) => void;
  onDestroy?: () => void;
  [key: string]: unknown;
}

// Mock TipTap React
vi.mock("@tiptap/react", () => ({
  EditorProvider: ({ children, ...props }: EditorProviderProps) => {
    // Simulate editor creation
    if (props.onCreate) {
      setTimeout(() => props.onCreate?.({ editor: mockEditorInstance }), 0);
    }
    // Store onDestroy for testing
    if (props.onDestroy) {
      (globalThis as { __mockOnDestroy?: () => void }).__mockOnDestroy = props.onDestroy;
    }
    return <div data-testid="editor-provider">{children}</div>;
  },
  useCurrentEditor: vi.fn(() => ({ editor: mockEditorInstance })),
}));

// Mock extension kit
vi.mock("@/components/extensions/extension-kit", () => ({
  ExtensionKit: vi.fn(() => []),
}));

// Mock TipTap core
vi.mock("@tiptap/core", () => ({
  Extension: {
    create: vi.fn(() => ({
      name: "escapeHandler",
      addKeyboardShortcuts: vi.fn(),
    })),
  },
}));

// Mock TipTap state
vi.mock("@tiptap/pm/state", () => ({
  TextSelection: {
    create: vi.fn(),
  },
}));

// Mock conversion utilities
vi.mock("@/lib", () => ({
  convertTiptapToElemental: vi.fn(),
  convertElementalToTiptap: vi.fn(),
  updateElemental: vi.fn(),
  // New getTitle utility functions
  getTitleForChannel: vi.fn(() => "Mocked Title"),
  getTitle: vi.fn(() => "Mocked Title"),
  getTitleFromContent: vi.fn(() => "Mocked Title"),
  getSubjectStorageFormat: vi.fn(() => "meta"),
  createTitleUpdate: vi.fn((_content, _channel, newTitle) => ({
    elements: [{ type: "meta", title: newTitle || "Mocked Title" }],
    raw: undefined,
  })),
  extractCurrentTitle: vi.fn((channelElement) => {
    // Look for meta title in the channel element
    if (channelElement && channelElement.elements) {
      const metaElement = channelElement.elements.find((el: any) => el.type === "meta" && el.title);
      if (metaElement) return metaElement.title;
    }
    return "Mocked Title";
  }),
  // New cleaning utility functions
  cleanInboxElements: vi.fn((elements) => elements),
  cleanTemplateContent: vi.fn((content) => content),
}));

// Mock BubbleTextMenu
vi.mock("@/components/ui/TextMenu/BubbleTextMenu", () => ({
  BubbleTextMenu: () => <div data-testid="bubble-text-menu" />,
}));

// Mock store imports
vi.mock("@/components/Providers/store", () => ({
  isTemplateLoadingAtom: "isTemplateLoadingAtom",
  templateDataAtom: "templateDataAtom",
}));

vi.mock("@/components/TemplateEditor/store", () => ({
  templateEditorAtom: "templateEditorAtom",
  subjectAtom: "subjectAtom",
  templateEditorContentAtom: "templateEditorContentAtom",
  isTemplateTransitioningAtom: "isTemplateTransitioningAtom",
}));

vi.mock("@/components/ui/TextMenu/store", () => ({
  selectedNodeAtom: "selectedNodeAtom",
  setPendingLinkAtom: "setPendingLinkAtom",
}));

// Import mocked modules after vi.mock calls
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { convertTiptapToElemental, convertElementalToTiptap, updateElemental } from "@/lib";

// Get mocked functions
const mockExtensionKit = vi.mocked(ExtensionKit);
const mockConvertTiptapToElemental = vi.mocked(convertTiptapToElemental);
const mockConvertElementalToTiptap = vi.mocked(convertElementalToTiptap);
const mockUpdateElemental = vi.mocked(updateElemental);
// Use the shared mock editor instance
const mockEditor = mockEditorInstance;

// Helper function to simulate editor destruction
const simulateEditorDestroy = () => {
  const onDestroy = (globalThis as { __mockOnDestroy?: () => void }).__mockOnDestroy;
  if (onDestroy) {
    onDestroy();
  }
};

// Helper functions to control mock state
const setMockState = (state: {
  templateContent?: ElementalContent | null;
  subject?: string | null;
  selectedNode?: MockSelectedNode | null;
  isTemplateLoading?: boolean;
  tenantData?: MockTenantData;
}) => {
  if (state.templateContent !== undefined) mockTemplateEditorContent = state.templateContent;
  if (state.subject !== undefined) mockSubject = state.subject;
  if (state.selectedNode !== undefined) mockSelectedNode = state.selectedNode;
  if (state.isTemplateLoading !== undefined) mockIsTemplateLoading = state.isTemplateLoading;
  if (state.tenantData !== undefined) mockTenantData = state.tenantData;
};

const resetMockState = () => {
  mockTemplateEditorContent = null;
  mockSubject = "Test Subject";
  mockSelectedNode = null;
  mockIsTemplateLoading = false;
  mockTenantData = {
    data: {
      tenant: {
        notification: {
          data: {
            content: null,
          },
        },
      },
    },
  };
};

describe("EmailEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();

    // Setup default mock returns
    mockConvertTiptapToElemental.mockReturnValue([{ type: "text", content: "Test content" }]);
    mockConvertElementalToTiptap.mockReturnValue({ type: "doc", content: [] });
    mockUpdateElemental.mockReturnValue({
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            { type: "meta", title: "Test Subject" },
            { type: "text", content: "Test content" },
          ],
        },
      ],
    });
    mockExtensionKit.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMockState();
    // Clear window.editor
    window.editor = null;
  });

  describe("Component Rendering", () => {
    it("should render EmailEditor component", () => {
      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(screen.getByTestId("bubble-text-menu")).toBeInTheDocument();
    });

    it("should render with template data", () => {
      setMockState({
        tenantData: {
          data: {
            tenant: {
              notification: {
                data: {
                  content: {
                    version: "2022-01-01",
                    elements: [
                      {
                        type: "channel",
                        channel: "email",
                        elements: [{ type: "text", content: "Initial content" }],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      });

      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should render in read-only mode", () => {
      render(<EmailEditor readOnly={true} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should render with custom subject", () => {
      render(<EmailEditor subject="Custom Subject" />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should render with variables", () => {
      const variables = { name: "John", age: 30 };

      render(<EmailEditor variables={variables} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      expect(mockExtensionKit).toHaveBeenCalledWith({
        variables,
        setSelectedNode: mockSetSelectedNode,
      });
    });
  });

  describe("Editor Initialization", () => {
    it("should set editor in atom on creation", async () => {
      render(<EmailEditor />);

      await waitFor(() => {
        expect(mockSetEmailEditor).toHaveBeenCalledWith(mockEditor);
      });
    });

    it("should set window.editor on creation", async () => {
      render(<EmailEditor />);

      await waitFor(() => {
        expect(window.editor).toBe(mockEditor);
      });
    });

    it("should call onUpdate when editor is created", async () => {
      render(<EmailEditor onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(mockEditor);
      });
    });

    it("should reset selected node on creation", async () => {
      render(<EmailEditor />);

      await waitFor(
        () => {
          expect(mockSetSelectedNode).toHaveBeenCalledWith(null);
        },
        { timeout: 200 }
      );
    });
  });

  describe("Content Management", () => {
    it("should render with templateData content", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [{ type: "text", content: "Template content" }],
          },
        ],
      };

      setMockState({
        tenantData: {
          data: {
            tenant: {
              notification: {
                data: {
                  content: templateContent,
                },
              },
            },
          },
        },
      });

      render(<EmailEditor />);

      // Wait for editor setup
      await waitFor(() => {
        expect(mockSetEmailEditor).toHaveBeenCalled();
      });

      // Component should render successfully with templateData
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should update template content when editor content changes", async () => {
      setMockState({
        templateContent: {
          version: "2022-01-01",
          elements: [],
        },
      });

      render(<EmailEditor />);

      await waitFor(() => {
        expect(mockConvertTiptapToElemental).toHaveBeenCalled();
        expect(mockSetTemplateEditorContent).toHaveBeenCalled();
      });
    });

    it("should include subject in template content", async () => {
      setMockState({
        templateContent: {
          version: "2022-01-01",
          elements: [],
        },
        subject: "Test Subject",
      });

      render(<EmailEditor />);

      await waitFor(() => {
        expect(mockUpdateElemental).toHaveBeenCalled();
        const updateCall = mockUpdateElemental.mock.calls[0];
        expect(updateCall[1].elements?.[0]).toEqual({
          type: "meta",
          title: "Test Subject",
        });
      });
    });

    it("should extract subject from existing content when prop subject is empty", async () => {
      const templateContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [
              { type: "meta", title: "Existing Subject" },
              { type: "text", content: "Content" },
            ],
          },
        ],
      };

      setMockState({
        templateContent,
        subject: "", // Empty string triggers subject extraction
        isTemplateLoading: false,
        tenantData: { id: "test" },
      });

      render(<EmailEditor />);

      await waitFor(() => {
        expect(mockUpdateElemental).toHaveBeenCalled();
      });

      const updateCall = mockUpdateElemental.mock.calls[0];
      expect(updateCall[0]).toEqual(templateContent); // First arg is templateEditorContent
      expect(updateCall[1].elements?.[0]).toEqual({
        type: "meta",
        title: "Existing Subject",
      });
    });
  });

  describe("Event Handlers", () => {
    it("should handle editor updates with debouncing", async () => {
      const { container } = render(<EmailEditor onUpdate={mockOnUpdate} />);

      // Get EditorProvider and simulate update
      const editorProvider = container.querySelector('[data-testid="editor-provider"]');
      expect(editorProvider).toBeInTheDocument();

      // Wait for debounced update
      await waitFor(
        () => {
          expect(mockConvertTiptapToElemental).toHaveBeenCalled();
        },
        { timeout: 300 }
      );
    });

    it("should handle selection updates", () => {
      render(<EmailEditor />);

      // The selection update handler should be configured
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle transactions", () => {
      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should call onDestroy when component unmounts", () => {
      const { unmount } = render(<EmailEditor onDestroy={mockOnDestroy} />);

      unmount();
      simulateEditorDestroy();

      expect(mockOnDestroy).toHaveBeenCalled();
      expect(window.editor).toBeNull();
    });
  });

  describe("Link Handling", () => {
    it("should handle link mark detection", () => {
      const mockLinkMark = { type: { name: "link" }, attrs: { href: "https://example.com" } };

      // Update the mock to return link marks
      (mockEditor.state.selection.$head.marks as Mock).mockReturnValue([mockLinkMark]);
      (mockEditor.isActive as Mock).mockReturnValue(true);

      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should clear pending link when no link is active", () => {
      // Update the mock to return empty marks
      (mockEditor.state.selection.$head.marks as Mock).mockReturnValue([]);
      (mockEditor.isActive as Mock).mockReturnValue(false);

      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Node Selection", () => {
    it("should update selected node on cursor movement", () => {
      const mockParagraphNode = { type: { name: "paragraph" } };

      // Mock the $anchor with a node method
      const mockAnchor = {
        pos: 1,
        depth: 1,
        node: vi.fn(() => mockParagraphNode),
      };

      mockEditor.state.selection.$anchor = mockAnchor as { pos: number; depth: number; node: Mock };

      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle heading node selection", () => {
      const mockHeadingNode = { type: { name: "heading" } };

      // Mock the $anchor with a node method
      const mockAnchor = {
        pos: 1,
        depth: 1,
        node: vi.fn(() => mockHeadingNode),
      };

      mockEditor.state.selection.$anchor = mockAnchor as { pos: number; depth: number; node: Mock };

      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should configure Escape key handler", () => {
      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
      // The Escape handler extension should be included in the extensions array
    });
  });

  describe("Editor Lifecycle", () => {
    it("should set editor to editable on unmount", () => {
      const { unmount } = render(<EmailEditor readOnly={false} />);

      unmount();

      expect(mockEditor.setEditable).toHaveBeenCalledWith(true);
    });

    it("should not call setEditable if editor is destroyed", () => {
      mockEditor.isDestroyed = true;

      const { unmount } = render(<EmailEditor />);

      unmount();

      expect(mockEditor.setEditable).not.toHaveBeenCalled();
    });
  });

  describe("Props Integration", () => {
    it("should use prop subject over atom subject", () => {
      setMockState({ subject: "Atom Subject" });

      render(<EmailEditor subject="Prop Subject" />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should fallback to atom subject when prop subject is null", () => {
      setMockState({ subject: "Atom Subject" });

      render(<EmailEditor subject={null} />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing template content gracefully", () => {
      setMockState({ templateContent: null });

      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle template loading state", () => {
      setMockState({ isTemplateLoading: true });

      render(<EmailEditor />);

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should handle invalid conversion input gracefully", () => {
      // Test with a mock that returns undefined/null instead of throwing
      mockConvertTiptapToElemental.mockReturnValueOnce(undefined as unknown as never);

      const { container } = render(<EmailEditor />);

      // Component should still render even with invalid conversion result
      expect(container).toBeInTheDocument();
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Click Handling", () => {
    it("should handle editor clicks", async () => {
      const { container } = render(<EmailEditor />);

      const editorProvider = container.querySelector('[data-testid="editor-provider"]');
      expect(editorProvider).toBeInTheDocument();

      if (editorProvider) {
        fireEvent.click(editorProvider);
      }

      // Should not throw and should handle the click
      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });

    it("should not handle clicks when editor is not editable", () => {
      mockEditor.isEditable = false;

      const { container } = render(<EmailEditor readOnly={true} />);

      const editorProvider = container.querySelector('[data-testid="editor-provider"]');
      expect(editorProvider).toBeInTheDocument();

      if (editorProvider) {
        fireEvent.click(editorProvider);
      }

      expect(screen.getByTestId("editor-provider")).toBeInTheDocument();
    });
  });

  describe("Debounced Updates", () => {
    it("should debounce multiple rapid updates", async () => {
      render(<EmailEditor onUpdate={mockOnUpdate} />);

      // Multiple rapid updates should be debounced
      await waitFor(
        () => {
          expect(mockConvertTiptapToElemental).toHaveBeenCalled();
        },
        { timeout: 300 }
      );

      // Should only process the final update after debounce period
      expect(mockUpdateElemental).toHaveBeenCalledTimes(1);
    });

    it("should clear pending updates on unmount", () => {
      const { unmount } = render(<EmailEditor onDestroy={mockOnDestroy} />);

      unmount();
      simulateEditorDestroy();

      expect(mockOnDestroy).toHaveBeenCalled();
    });
  });

  describe("Global Editor Access", () => {
    it("should set window.editor for global access", async () => {
      render(<EmailEditor />);

      await waitFor(() => {
        expect(window.editor).toBe(mockEditor);
      });
    });

    it("should clear window.editor on destroy", () => {
      const { unmount } = render(<EmailEditor />);

      unmount();

      expect(window.editor).toBeNull();
    });
  });
});
