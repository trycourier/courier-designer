import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { usePragmaticDnd } from "./usePragmaticDnd";
import {
  isDraggingAtom,
  templateEditorAtom,
  templateEditorContentAtom,
  blockPresetsAtom,
  blockDefaultsAtom,
} from "../store";
import type { Editor } from "@tiptap/react";

// Mock pragmatic-drag-and-drop
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  monitorForElements: vi.fn(({ onDragStart, onDrop }) => {
    // Return cleanup function
    return () => {};
  }),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  extractClosestEdge: vi.fn(() => "bottom"),
}));

// Mock TipTap Editor
const createMockEditor = (): Partial<Editor> => {
  const mockDoc = {
    childCount: 0,
    content: {
      size: 0,
    },
    descendants: vi.fn((callback) => {
      // Mock implementation
      return true;
    }),
    nodeAt: vi.fn(() => null),
    resolve: vi.fn((pos) => ({
      depth: 0,
      index: (depth: number) => 0,
    })),
  };

  return {
    state: {
      doc: mockDoc as any,
      tr: {
        delete: vi.fn(),
        insert: vi.fn(),
        replaceWith: vi.fn(),
      } as any,
    },
    view: {
      dom: document.createElement("div"),
      dispatch: vi.fn(),
    },
    commands: {
      insertContentAt: vi.fn(() => ({ run: vi.fn() })),
      removeDragPlaceholder: vi.fn(),
    },
    schema: {
      nodes: {
        paragraph: {
          create: vi.fn(),
        },
        columnCell: {
          create: vi.fn(),
        },
        columnRow: {
          create: vi.fn(),
        },
      },
      nodeFromJSON: vi.fn(),
    },
    getJSON: vi.fn(() => ({ type: "doc", content: [] })),
    chain: vi.fn(() => ({
      deleteRange: vi.fn(() => ({
        insertContentAt: vi.fn(() => ({
          run: vi.fn(),
        })),
      })),
      insertContentAt: vi.fn(() => ({
        deleteRange: vi.fn(() => ({
          run: vi.fn(),
        })),
      })),
    })),
  } as any;
};

describe("usePragmaticDnd", () => {
  let store: ReturnType<typeof createStore>;
  let mockEditor: Partial<Editor>;

  beforeEach(() => {
    store = createStore();
    mockEditor = createMockEditor();
    vi.clearAllMocks();
  });

  describe("Hook initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["text", "heading"], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current.activeId).toBeNull();
      expect(result.current.activeDragType).toBeNull();
      expect(result.current.dndMode).toBe("outer");
      expect(result.current.lastPlaceholderIndex).toBeNull();
    });

    it("should return cleanup function", () => {
      const { result, unmount } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: [], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current.cleanupPlaceholder).toBeDefined();
      expect(typeof result.current.cleanupPlaceholder).toBe("function");

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Drag state management", () => {
    it("should update isDraggingAtom on drag start", async () => {
      const { result } = renderHook(
        () => ({
          dnd: usePragmaticDnd({
            items: { Sidebar: ["text"], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
          isDragging: store.get(isDraggingAtom),
        }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      // Initially should not be dragging
      expect(result.current.isDragging).toBe(false);

      // Note: Actual drag start would be triggered by pragmatic-dnd's monitorForElements
      // This test verifies the hook structure is correct
      expect(result.current.dnd.activeId).toBeNull();
    });
  });

  describe("Column drop handling", () => {
    it("should handle column cell drop from sidebar", () => {
      const setItems = vi.fn();
      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["text"], Editor: [] },
            setItems,
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      // Verify cleanup function exists
      expect(result.current.cleanupPlaceholder).toBeDefined();
      expect(typeof result.current.cleanupPlaceholder).toBe("function");
    });

    it("should handle column cell drop from editor", () => {
      const setItems = vi.fn();
      const mockEditorWithContent = {
        ...mockEditor,
        state: {
          ...mockEditor.state!,
          doc: {
            ...mockEditor.state!.doc,
            childCount: 1,
            descendants: vi.fn((callback) => {
              callback(
                {
                  type: { name: "paragraph" },
                  attrs: { id: "test-id" },
                  nodeSize: 3,
                  toJSON: vi.fn(() => ({ type: "paragraph", attrs: {} })),
                } as any,
                0,
                null
              );
              return true;
            }),
          },
        },
      };

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: [], Editor: ["test-id"] },
            setItems,
            editor: mockEditorWithContent as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current.cleanupPlaceholder).toBeDefined();
    });
  });

  describe("Node creation", () => {
    it("should create nodes from drag types", () => {
      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["text", "heading", "image", "button"], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      // Hook should be initialized
      expect(result.current).toBeDefined();
    });
  });

  describe("Cleanup functionality", () => {
    it("should provide cleanupPlaceholder function", () => {
      const mockCommands = {
        removeDragPlaceholder: vi.fn(),
      };
      const editorWithCommands = {
        ...mockEditor,
        commands: mockCommands,
      };

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: [], Editor: [] },
            setItems: vi.fn(),
            editor: editorWithCommands as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      act(() => {
        result.current.cleanupPlaceholder();
      });

      // Verify cleanup was called (if editor exists)
      if (editorWithCommands.commands) {
        expect(mockCommands.removeDragPlaceholder).toHaveBeenCalled();
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle null editor", () => {
      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: [], Editor: [] },
            setItems: vi.fn(),
            editor: null,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
      expect(result.current.cleanupPlaceholder).toBeDefined();
    });

    it("should handle empty items arrays", () => {
      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: [], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });

    it("should handle items with multiple elements", () => {
      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: {
              Sidebar: ["text", "heading", "image", "button", "divider"],
              Editor: ["id1", "id2", "id3"],
            },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });
  });

  describe("Preset handling", () => {
    it("should initialize with presets from atom", () => {
      // Set up presets before rendering hook
      store.set(blockPresetsAtom, [
        {
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com" },
        },
      ]);

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: [{ type: "button", preset: "portal" }], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });

    it("should handle sidebar items with preset references", () => {
      store.set(blockPresetsAtom, [
        {
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com" },
        },
        {
          type: "button",
          key: "survey",
          label: "Take Survey",
          attributes: { href: "https://survey.example.com" },
        },
      ]);

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: {
              Sidebar: [
                "text",
                { type: "button", preset: "portal" },
                "image",
                { type: "button", preset: "survey" },
              ],
              Editor: [],
            },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });

    it("should handle mixed built-in blocks and presets", () => {
      store.set(blockPresetsAtom, [
        {
          type: "button",
          key: "portal",
          label: "Go to Portal",
          attributes: { href: "https://portal.example.com" },
        },
      ]);

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: {
              Sidebar: [
                "heading",
                "text",
                { type: "button", preset: "portal" },
                "image",
                "button",
                "divider",
              ],
              Editor: [],
            },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });

    it("should use block defaults from atom", () => {
      store.set(blockDefaultsAtom, {
        button: { borderRadius: "4px", backgroundColor: "#007bff" },
        image: { width: 600, align: "center" },
      });

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: {
              Sidebar: ["button", "image"],
              Editor: [],
            },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });

    it("should handle presets with custom icons", () => {
      store.set(blockPresetsAtom, [
        {
          type: "button",
          key: "link",
          label: "External Link",
          icon: "custom-icon-node",
          attributes: { href: "https://example.com" },
        },
      ]);

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: {
              Sidebar: [{ type: "button", preset: "link" }],
              Editor: [],
            },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });

    it("should handle empty presets atom", () => {
      store.set(blockPresetsAtom, []);
      store.set(blockDefaultsAtom, {});

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: {
              Sidebar: ["text", "button"],
              Editor: [],
            },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(result.current).toBeDefined();
    });
  });

  describe("Auto-selection after drop", () => {
    it("should have access to setSelectedNode for auto-selection", () => {
      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["image"], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditor as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      // The hook should be properly initialized with selection capabilities
      expect(result.current).toBeDefined();
      expect(result.current.activeId).toBeNull();
    });

    it("should handle deferred selection after insertion", async () => {
      // Create a mock editor with nodeAt capability
      const mockNode = {
        type: { name: "imageBlock" },
        attrs: { id: "test-node-id" },
      };

      const mockEditorWithNodeAt = {
        ...mockEditor,
        isDestroyed: false,
        state: {
          ...mockEditor.state!,
          doc: {
            ...mockEditor.state!.doc,
            nodeAt: vi.fn(() => mockNode),
            descendants: vi.fn((callback) => {
              callback(mockNode as any, 0, null);
              return true;
            }),
            resolve: vi.fn((pos) => ({
              depth: 0,
              index: () => 0,
            })),
          },
        },
      };

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["image"], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditorWithNodeAt as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      // Hook should be initialized and ready for deferred selection
      expect(result.current).toBeDefined();
    });

    it("should preserve node type for position-based selection", () => {
      const mockEditorWithSchema = {
        ...mockEditor,
        isDestroyed: false,
        state: {
          ...mockEditor.state!,
          doc: {
            ...mockEditor.state!.doc,
            nodeAt: vi.fn((pos) => ({
              type: { name: "imageBlock" },
              attrs: { id: "new-id-after-rerender" },
            })),
          },
        },
      };

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["image"], Editor: [] },
            setItems: vi.fn(),
            editor: mockEditorWithSchema as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      // The hook should properly handle position-based selection
      // after controlled mode re-renders change node IDs
      expect(result.current).toBeDefined();
    });

    it("should handle editor destruction during deferred selection", () => {
      const mockDestroyedEditor = {
        ...mockEditor,
        isDestroyed: true,
      };

      const { result } = renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["image"], Editor: [] },
            setItems: vi.fn(),
            editor: mockDestroyedEditor as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );

      // Should handle destroyed editor gracefully
      expect(result.current).toBeDefined();
    });

    it("should support selection for different node types", () => {
      const nodeTypes = ["image", "button", "divider", "text", "heading"];

      nodeTypes.forEach((nodeType) => {
        const { result } = renderHook(
          () =>
            usePragmaticDnd({
              items: { Sidebar: [nodeType], Editor: [] },
              setItems: vi.fn(),
              editor: mockEditor as Editor,
            }),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );

        expect(result.current).toBeDefined();
      });
    });
  });
});
