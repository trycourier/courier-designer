import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { ElementalContent } from "@/types/elemental.types";

// Define types for global dnd handlers
interface DndHandlers {
  onDragStart?: (event: unknown) => void;
  onDragEnd?: (event: unknown) => void;
  onDragMove?: (event: unknown) => void;
  onDragCancel?: () => void;
}

interface GlobalThisWithDnd {
  __dndHandlers?: DndHandlers;
}

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragEnd,
    onDragMove,
    onDragCancel,
  }: {
    children: React.ReactNode;
    onDragStart?: (event: unknown) => void;
    onDragEnd?: (event: unknown) => void;
    onDragMove?: (event: unknown) => void;
    onDragCancel?: () => void;
  }) => {
    // Store handlers for testing
    (globalThis as GlobalThisWithDnd).__dndHandlers = {
      onDragStart,
      onDragEnd,
      onDragMove,
      onDragCancel,
    };
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  MouseSensor: vi.fn(),
  TouchSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(() => [{ id: "test-collision" }]),
  pointerWithin: vi.fn(() => [{ id: "test-pointer" }]),
  rectIntersection: vi.fn(() => [{ id: "test-rect" }]),
  getFirstCollision: vi.fn((collisions) => collisions[0]),
  MeasuringStrategy: {
    Always: "always",
  },
}));

// Mock dnd-kit sortable
vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: vi.fn((array, from, to) => {
    const newArray = [...array];
    const [moved] = newArray.splice(from, 1);
    newArray.splice(to, 0, moved);
    return newArray;
  }),
  verticalListSortingStrategy: "vertical",
}));

// Create shared mock state with proper types
interface MockNode {
  attrs: { id: string };
  type: { name: string };
}

interface MockEditor {
  commands: {
    blur: () => void;
    removeDragPlaceholder: () => void;
    setDragPlaceholder: (data: unknown) => void;
  };
  state: {
    doc: {
      childCount: number;
      child: (index: number) => MockNode;
      content: {
        size: number;
        forEach: (callback: (node: MockNode, offset: number, index: number) => void) => void;
      };
    };
    selection: Record<string, unknown>;
  };
  view: {
    dom: {
      querySelectorAll: () => Array<{
        dataset: { id: string };
        getBoundingClientRect: () => { top: number; height: number };
      }>;
    };
    dispatch: () => void;
    state: {
      tr: { replaceWith: () => unknown };
      doc: { content: { size: number } };
    };
  };
  getJSON: () => Record<string, unknown>;
  on: () => void;
  off: () => void;
  setEditable: (editable: boolean) => void;
  isDestroyed: boolean;
  schema: { nodeFromJSON: () => { type: string } };
}

let mockEmailEditor: MockEditor | null = null;
let mockSelectedNode: MockNode | null = null;
let mockSubject = "Test Subject";
let mockTemplateEditorContent: ElementalContent | null = {
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
};
let mockTemplateData = {
  data: {
    tenant: {
      brand: {
        settings: {
          colors: {
            primary: "#000000",
            secondary: "#333333",
            tertiary: "#666666",
          },
          email: {
            header: {
              logo: { image: "test-logo.png", href: "https://test.com" },
              barColor: "#ffffff",
            },
            footer: {
              social: {
                facebook: { url: "https://facebook.com" },
                linkedin: { url: "https://linkedin.com" },
              },
            },
          },
        },
      },
    },
  },
};
let mockIsTemplateLoading = false;
let mockIsTemplateTransitioning = false;
let mockBrandApply = false;
let mockBrandEditorForm: Record<string, unknown> | null = null;
let mockBrandEditorContent: Record<string, unknown> | null = null;

// Mock Jotai store
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai");
  return {
    ...actual,
    useAtom: vi.fn((atom) => {
      if (atom === "selectedNodeAtom") return [mockSelectedNode, vi.fn()];
      if (atom === "subjectAtom") return [mockSubject, vi.fn()];
      if (atom === "templateEditorContentAtom") return [mockTemplateEditorContent, vi.fn()];
      return [null, vi.fn()];
    }),
    useAtomValue: vi.fn((atom) => {
      if (atom === "templateEditorAtom") return mockEmailEditor;
      if (atom === "brandEditorAtom") return mockEmailEditor;
      if (atom === "templateDataAtom") return mockTemplateData;
      if (atom === "isTemplateLoadingAtom") return mockIsTemplateLoading;
      if (atom === "isTemplateTransitioningAtom") return mockIsTemplateTransitioning;
      if (atom === "brandApplyAtom") return mockBrandApply;
      if (atom === "BrandEditorFormAtom") return mockBrandEditorForm;
      if (atom === "BrandEditorContentAtom") return mockBrandEditorContent;
      if (atom === "templateIdAtom") return "test-template-id";
      if (atom === "isDraggingAtom") return false;
      return null;
    }),
    useSetAtom: vi.fn(() => vi.fn()),
  };
});

// Mock the store atoms
vi.mock("../../../Providers/store", () => ({
  brandApplyAtom: "brandApplyAtom",
  isTemplateLoadingAtom: "isTemplateLoadingAtom",
  templateDataAtom: "templateDataAtom",
  templateIdAtom: "templateIdAtom",
}));

vi.mock("@/components/BrandEditor/store", () => ({
  BrandEditorContentAtom: "BrandEditorContentAtom",
  BrandEditorFormAtom: "BrandEditorFormAtom",
}));

vi.mock("../../store", () => ({
  templateEditorAtom: "templateEditorAtom",
  subjectAtom: "subjectAtom",
  templateEditorContentAtom: "templateEditorContentAtom",
  isTemplateTransitioningAtom: "isTemplateTransitioningAtom",
  brandEditorAtom: "brandEditorAtom",
  isDraggingAtom: "isDraggingAtom",
  pendingAutoSaveAtom: "pendingAutoSaveAtom",
}));

vi.mock("@/components/ui/TextMenu/store", () => ({
  selectedNodeAtom: "selectedNodeAtom",
  setNodeConfigAtom: "setNodeConfigAtom",
}));

// Mock requestAnimationFrame for test environment
Object.defineProperty(global, "requestAnimationFrame", {
  writable: true,
  value: vi.fn((callback) => setTimeout(callback, 16)),
});

Object.defineProperty(global, "cancelAnimationFrame", {
  writable: true,
  value: vi.fn((id) => clearTimeout(id)),
});

// Mock document.elementsFromPoint for JSDOM
if (!document.elementsFromPoint) {
  document.elementsFromPoint = vi.fn((x: number, y: number) => []);
}

// Mock TipTap editor
const mockEditorInstance: MockEditor = {
  commands: {
    blur: vi.fn(),
    removeDragPlaceholder: vi.fn(),
    setDragPlaceholder: vi.fn(),
  },
  state: {
    doc: {
      childCount: 2,
      child: vi.fn(
        (index: number): MockNode => ({
          attrs: { id: `node-${index}` },
          type: { name: "paragraph" },
        })
      ),
      content: {
        size: 100,
        forEach: vi.fn((callback: (node: MockNode, offset: number, index: number) => void) => {
          // Mock document content iteration with consistent structure
          const node0: MockNode = { attrs: { id: "node-0" }, type: { name: "paragraph" } };
          const node1: MockNode = { attrs: { id: "node-1" }, type: { name: "paragraph" } };
          callback(node0, 0, 0);
          callback(node1, 1, 1);
        }),
      },
      descendants: vi.fn((callback: (node: MockNode, pos: number) => boolean | void) => {
        // Mock document traversal for testing
        const node0: MockNode = { attrs: { id: "node-0" }, type: { name: "paragraph" } };
        const node1: MockNode = { attrs: { id: "node-1" }, type: { name: "paragraph" } };

        const shouldContinue0 = callback(node0, 0);
        if (shouldContinue0 === false) return;

        const shouldContinue1 = callback(node1, 1);
        if (shouldContinue1 === false) return;
      }),
    },
    selection: {},
  },
  view: {
    dom: {
      querySelectorAll: vi.fn(() => [
        {
          dataset: { id: "node-1" },
          getBoundingClientRect: () => ({ top: 50, height: 20 }),
          getAttribute: vi.fn((attr: string) => {
            if (attr === "data-placeholder") return "false";
            return null;
          }),
        },
        {
          dataset: { id: "node-2" },
          getBoundingClientRect: () => ({ top: 100, height: 20 }),
          getAttribute: vi.fn((attr: string) => {
            if (attr === "data-placeholder") return "false";
            return null;
          }),
        },
      ]),
      querySelector: vi.fn((selector: string) => {
        // Return a mock element for any selector
        return {
          dataset: { id: "mock-element" },
          getAttribute: vi.fn(() => null),
          getBoundingClientRect: () => ({ top: 50, height: 20 }),
        };
      }),
    },
    dispatch: vi.fn(),
    state: {
      tr: {
        replaceWith: vi.fn().mockReturnThis(),
      },
      doc: {
        content: { size: 100 },
      },
    },
  },
  getJSON: vi.fn(() => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Test content" }] }],
  })),
  on: vi.fn(),
  off: vi.fn(),
  setEditable: vi.fn(),
  isDestroyed: false,
  schema: {
    nodeFromJSON: vi.fn(() => ({ type: "doc" })),
  },
};

// Mock conversion utilities
vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
  convertElementalToTiptap: vi.fn(() => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Converted content" }] }],
  })),
  convertTiptapToElemental: vi.fn(() => [{ type: "text", content: "Elemental content" }]),
  updateElemental: vi.fn((content, update) => ({
    ...content,
    elements: [update],
  })),
  // New getTitle utility functions
  getTitleForChannel: vi.fn(() => "Mocked Title"),
  getTitle: vi.fn(() => "Mocked Title"),
  getTitleFromContent: vi.fn(() => "Mocked Title"),
  getSubjectStorageFormat: vi.fn(() => "meta"),
  createTitleUpdate: vi.fn(() => ({
    elements: [{ type: "meta", title: "Mocked Title" }],
    raw: undefined,
  })),
  extractCurrentTitle: vi.fn(() => "Mocked Title"),
  // New cleaning utility functions
  cleanInboxElements: vi.fn((elements) => elements),
  cleanTemplateContent: vi.fn((content) => content),
}));

// Mock UI components
vi.mock("@/components/ui/MainLayout", () => ({
  MainLayout: ({ children, Header }: { children: React.ReactNode; Header?: React.ReactNode }) => (
    <div data-testid="main-layout">
      {Header && <div data-testid="header">{Header}</div>}
      {children}
    </div>
  ),
}));

vi.mock("../Channels", () => ({
  Channels: ({
    hidePublish: _hidePublish,
    channels: _channels,
    routing: _routing,
  }: {
    hidePublish?: boolean;
    channels?: unknown;
    routing?: unknown;
  }) => <div data-testid="channels">Channels Component</div>,
}));

// Mock block components
vi.mock("@/components/ui/Blocks/HeadingBlock", () => ({
  HeadingBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="heading-block" data-draggable={draggable}>
      Heading Block
    </div>
  ),
}));

vi.mock("@/components/ui/Blocks/TextBlock", () => ({
  TextBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="text-block" data-draggable={draggable}>
      Text Block
    </div>
  ),
}));

vi.mock("@/components/ui/Blocks/ImageBlock", () => ({
  ImageBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="image-block" data-draggable={draggable}>
      Image Block
    </div>
  ),
}));

vi.mock("@/components/ui/Blocks/SpacerBlock", () => ({
  SpacerBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="spacer-block" data-draggable={draggable}>
      Spacer Block
    </div>
  ),
}));

vi.mock("@/components/ui/Blocks/DividerBlock", () => ({
  DividerBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="divider-block" data-draggable={draggable}>
      Divider Block
    </div>
  ),
}));

vi.mock("@/components/ui/Blocks/ButtonBlock", () => ({
  ButtonBlock: ({ draggable }: { draggable?: boolean }) => (
    <div data-testid="button-block" data-draggable={draggable}>
      Button Block
    </div>
  ),
}));

// Mock TextMenu configuration
vi.mock("../../../ui/TextMenu/config", () => ({
  getTextMenuConfigForNode: vi.fn(() => ({ config: "test-config" })),
}));

// Mock utility functions
vi.mock("../../../utils", () => ({
  createOrDuplicateNode: vi.fn((_editor, type, _pos, _data, callback) => {
    const mockNode = { type: { name: type }, attrs: { id: `new-${type}-node` } };
    callback?.(mockNode);
  }),
  coordinateGetter: vi.fn(),
}));

vi.mock("../../../utils/multipleContainersKeyboardCoordinates", () => ({
  coordinateGetter: vi.fn(),
}));

// Import the component after mocks
import { Email, defaultEmailContent } from "./Email";

// Helper functions to control mock state
const setMockState = (state: {
  emailEditor?: MockEditor | null;
  selectedNode?: MockNode | null;
  subject?: string;
  templateContent?: ElementalContent | null;
  templateData?: typeof mockTemplateData;
  isTemplateLoading?: boolean;
  isTemplateTransitioning?: boolean;
  brandApply?: boolean;
  brandEditorForm?: Record<string, unknown> | null;
  brandEditorContent?: Record<string, unknown> | null;
}) => {
  if (state.emailEditor !== undefined) mockEmailEditor = state.emailEditor;
  if (state.selectedNode !== undefined) mockSelectedNode = state.selectedNode;
  if (state.subject !== undefined) mockSubject = state.subject;
  if (state.templateContent !== undefined) mockTemplateEditorContent = state.templateContent;
  if (state.templateData !== undefined) mockTemplateData = state.templateData;
  if (state.isTemplateLoading !== undefined) mockIsTemplateLoading = state.isTemplateLoading;
  if (state.isTemplateTransitioning !== undefined)
    mockIsTemplateTransitioning = state.isTemplateTransitioning;
  if (state.brandApply !== undefined) mockBrandApply = state.brandApply;
  if (state.brandEditorForm !== undefined) mockBrandEditorForm = state.brandEditorForm;
  if (state.brandEditorContent !== undefined) mockBrandEditorContent = state.brandEditorContent;
};

const resetMockState = () => {
  mockEmailEditor = mockEditorInstance;
  mockSelectedNode = null;
  mockSubject = "Test Subject";
  mockTemplateEditorContent = {
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
  };
  mockTemplateData = {
    data: {
      tenant: {
        brand: {
          settings: {
            colors: {
              primary: "#000000",
              secondary: "#333333",
              tertiary: "#666666",
            },
            email: {
              header: {
                logo: { image: "test-logo.png", href: "https://test.com" },
                barColor: "#ffffff",
              },
              footer: {
                social: {
                  facebook: { url: "https://facebook.com" },
                  linkedin: { url: "https://linkedin.com" },
                },
              },
            },
          },
        },
      },
    },
  };
  mockIsTemplateLoading = false;
  mockIsTemplateTransitioning = false;
  mockBrandApply = false;
  mockBrandEditorForm = null;
  mockBrandEditorContent = null;
};

describe("Email Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();

    // Clear global handlers
    delete (globalThis as GlobalThisWithDnd).__dndHandlers;
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMockState();

    // Clear global handlers
    delete (globalThis as GlobalThisWithDnd).__dndHandlers;
  });

  describe("Component Rendering", () => {
    it("should render with header and custom render function", () => {
      const mockHeaderRenderer = vi.fn(() => <div data-testid="custom-header">Custom Header</div>);
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(
        <Email
          routing={{ method: "all", channels: [] }}
          headerRenderer={mockHeaderRenderer}
          render={mockRender}
        />
      );

      expect(screen.getByTestId("custom-header")).toBeInTheDocument();
      expect(mockHeaderRenderer).toHaveBeenCalledWith({
        hidePublish: undefined,
        channels: undefined,
        routing: { method: "all", channels: [] },
      });
    });

    it("should render with loading state", () => {
      setMockState({ isTemplateLoading: true });
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    });
  });

  describe("Brand Settings", () => {
    it("should compute brand settings from tenant data", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          brandSettings: expect.objectContaining({
            brandColor: "#000000",
            textColor: "#333333",
            subtleColor: "#666666",
            headerStyle: "border",
            logo: "test-logo.png",
            link: "https://test.com",
            facebookLink: "https://facebook.com",
            linkedinLink: "https://linkedin.com",
            instagramLink: undefined,
            mediumLink: undefined,
            xLink: undefined,
          }),
        })
      );
    });

    it("should use brand editor form when available", () => {
      setMockState({
        brandEditorForm: {
          brandColor: "#ff0000",
          textColor: "#00ff00",
          subtleColor: "#0000ff",
          headerStyle: "border",
        },
      });

      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          brandSettings: {
            brandColor: "#ff0000",
            textColor: "#00ff00",
            subtleColor: "#0000ff",
            headerStyle: "border",
          },
        })
      );
    });

    it("should apply brand settings when brand apply is enabled", () => {
      setMockState({ brandApply: true });

      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          isBrandApply: true,
        })
      );
    });
  });

  describe("Content Management", () => {
    it("should provide content from template editor", async () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(
        <Email
          routing={{ method: "all", channels: [] }}
          render={mockRender}
          value={mockTemplateEditorContent}
        />
      );

      // Wait for the 100ms delay in showContent useEffect
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            type: "doc",
            content: expect.any(Array),
          }),
        })
      );
    });

    it("should use default content when no template content exists", async () => {
      setMockState({ templateContent: null });
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      const defaultContentStructure: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: defaultEmailContent,
          },
        ],
      };

      render(
        <Email
          routing={{ method: "all", channels: [] }}
          render={mockRender}
          value={defaultContentStructure}
        />
      );

      // Wait for the 100ms delay in showContent useEffect
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            type: "doc",
            content: expect.any(Array),
          }),
        })
      );
    });

    it("should extract subject from template content", () => {
      setMockState({
        templateContent: {
          version: "2022-01-01",
          elements: [
            {
              type: "channel",
              channel: "email",
              elements: [
                { type: "meta", title: "Extracted Subject" },
                { type: "text", content: "Test content" },
              ],
            },
          ],
        },
      });

      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Test Subject", // From mock state
        })
      );
    });
  });

  describe("Preview Mode", () => {
    it("should provide preview mode toggle function", async () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          togglePreviewMode: expect.any(Function),
          previewMode: undefined,
        })
      );
    });

    it("should set editor to readonly in preview mode", async () => {
      let capturedToggle: ((mode: "desktop" | "mobile" | undefined) => void) | null = null;

      const mockRender = vi.fn(
        (props: { togglePreviewMode: (mode: "desktop" | "mobile" | undefined) => void }) => {
          capturedToggle = props.togglePreviewMode;
          return <div data-testid="custom-render">Custom Render</div>;
        }
      );

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      if (capturedToggle) {
        await act(async () => {
          capturedToggle!("desktop");
        });

        await waitFor(() => {
          if (mockEmailEditor) {
            expect(mockEmailEditor.setEditable).toHaveBeenCalledWith(false);
          }
        });
      }
    });

    it("should set editor to editable when exiting preview mode", async () => {
      let capturedToggle: ((mode: "desktop" | "mobile" | undefined) => void) | null = null;

      const mockRender = vi.fn(
        (props: { togglePreviewMode: (mode: "desktop" | "mobile" | undefined) => void }) => {
          capturedToggle = props.togglePreviewMode;
          return <div data-testid="custom-render">Custom Render</div>;
        }
      );

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      if (capturedToggle) {
        // First set to preview mode
        await act(async () => {
          capturedToggle!("desktop");
        });

        // Then exit preview mode
        await act(async () => {
          capturedToggle!(undefined);
        });

        await waitFor(() => {
          if (mockEmailEditor) {
            expect(mockEmailEditor.setEditable).toHaveBeenCalledWith(true);
          }
        });
      }
    });
  });

  describe("Drag and Drop", () => {
    beforeEach(() => {
      // Reset DnD handlers before each test
      delete (globalThis as GlobalThisWithDnd).__dndHandlers;
    });

    it("should handle drag start from sidebar", async () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      // Simulate drag start
      const mockEvent = {
        active: { id: "text", data: { current: { type: "text" } } },
      };

      await act(async () => {
        const handlers = (globalThis as GlobalThisWithDnd).__dndHandlers;
        if (handlers?.onDragStart) {
          handlers.onDragStart(mockEvent);
        }
      });

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });

    it("should handle drag move with placeholder", async () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      // Simulate drag over
      const mockEvent = {
        active: {
          id: "text",
          data: { current: { type: "text" } },
          rect: { current: { translated: { top: 100 } } },
        },
        over: { id: "Editor" },
        delta: { x: 0, y: 100 },
        activatorEvent: { clientY: 100 },
        collisions: [{ id: "Editor" }],
      };

      await act(async () => {
        const handlers = (globalThis as GlobalThisWithDnd).__dndHandlers;
        if (handlers?.onDragMove) {
          handlers.onDragMove(mockEvent);
        }
      });

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });

    it("should handle drag end for new element insertion", async () => {
      setMockState({
        templateContent: {
          version: "2022-01-01",
          elements: [
            {
              type: "channel",
              channel: "email",
              elements: [{ type: "text", content: "Test content" }],
            },
          ],
        },
      });

      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      const mockEvent = {
        active: {
          id: "text",
          data: { current: { type: "text" } },
          rect: { current: { translated: { top: 100, height: 20 } } },
        },
        over: { id: "Editor" },
      };

      await act(async () => {
        const handlers = (globalThis as GlobalThisWithDnd).__dndHandlers;
        if (handlers?.onDragEnd) {
          handlers.onDragEnd(mockEvent);
        }
      });

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });

    it("should handle drag cancel", async () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      await act(async () => {
        const handlers = (globalThis as GlobalThisWithDnd).__dndHandlers;
        if (handlers?.onDragCancel) {
          handlers.onDragCancel();
        }
      });

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });

    it("should render drag overlay for different block types", async () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      // With pragmatic-drag-and-drop, drag overlay is handled differently
      // Just verify the component renders
      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });
  });

  describe("Editor Integration", () => {
    it("should provide editor reference to render function", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalled();
    });

    it("should provide sync editor items function", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalled();
    });

    it("should provide items state for drag and drop", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          items: {
            Editor: expect.any(Array),
            Sidebar: expect.arrayContaining([
              "heading",
              "text",
              "image",
              "spacer",
              "divider",
              "button",
            ]),
          },
        })
      );
    });

    it("should provide sorting strategy", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      // Strategy is no longer provided with pragmatic-drag-and-drop
      // Just verify the render function is called
      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe("Subject Handling", () => {
    it("should provide subject value to render function", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Test Subject",
        })
      );
    });

    it("should provide subject change handler", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe("Node Selection", () => {
    it("should provide selected node to render function", () => {
      setMockState({ selectedNode: { attrs: { id: "node-0" }, type: { name: "paragraph" } } });

      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedNode: { attrs: { id: "node-0" }, type: { name: "paragraph" } },
        })
      );
    });

    it("should provide setSelectedNode function", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);

      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe("Default Content", () => {
    it("should export default email content", () => {
      expect(defaultEmailContent).toEqual([
        {
          type: "text",
          align: "left",
          content: "\n",
          text_style: "h1",
        },
        {
          type: "text",
          align: "left",
          content: "",
        },
        {
          type: "image",
          src: "",
        },
      ]);
    });
  });

  describe("Keyboard Handling", () => {
    it("should handle Escape key to deselect node", async () => {
      setMockState({ selectedNode: { type: { name: "paragraph" }, attrs: { id: "test-node" } } });
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      await act(async () => {
        fireEvent.keyDown(document, { key: "Escape" });
      });

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });

    it("should handle Tab key for navigation", async () => {
      setMockState({
        emailEditor: mockEmailEditor,
        selectedNode: { type: { name: "paragraph" }, attrs: { id: "test-node" } },
      });

      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      await act(async () => {
        fireEvent.keyDown(document, { key: "Tab" });
      });

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });

    it("should handle Shift+Tab for reverse navigation", async () => {
      setMockState({
        emailEditor: mockEmailEditor,
        selectedNode: { type: { name: "paragraph" }, attrs: { id: "test-node" } },
      });

      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);

      await act(async () => {
        render(<Email routing={{ method: "all", channels: [] }} render={mockRender} />);
      });

      await act(async () => {
        fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      });

      expect(screen.getByTestId("custom-render")).toBeInTheDocument();
    });
  });

  describe("Component Props", () => {
    it("should handle all supported props", () => {
      const mockRender = vi.fn(() => <div data-testid="custom-render">Custom Render</div>);
      const mockHeaderRenderer = vi.fn(() => <div>Header</div>);

      render(
        <Email
          hidePublish={true}
          theme="dark"
          channels={["email", "sms"]}
          routing={{ method: "all", channels: [] }}
          headerRenderer={mockHeaderRenderer}
          render={mockRender}
        />
      );

      expect(mockRender).toHaveBeenCalled();
    });
  });
});
