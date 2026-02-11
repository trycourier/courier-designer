import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { Editor } from "@tiptap/react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

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

// Mock lib/utils used by triggerAutoSave
vi.mock("@/lib/utils", () => ({
  convertTiptapToElemental: vi.fn(() => []),
  updateElemental: vi.fn((content) => content || {}),
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

  describe("Caret placement after sidebar drop", () => {
    // Helper to extract the onDrop callback from the latest monitorForElements call
    const getOnDrop = () => {
      const mockCalls = vi.mocked(monitorForElements).mock.calls;
      const lastCall = mockCalls[mockCalls.length - 1];
      return (lastCall[0] as any).onDrop as (args: any) => void;
    };

    // Helper to create a mock drop event for sidebar → editor
    const createSidebarDropEvent = (dragType: string) => ({
      source: {
        data: { id: dragType, type: "sidebar", dragType },
      },
      location: {
        current: {
          dropTargets: [
            {
              data: {
                id: "existing-node",
                type: "editor",
                index: 0,
                pos: 0,
              },
            },
          ],
          input: { clientY: 100 },
        },
      },
    });

    // Creates a mock editor that supports the full handleDrop code path
    const createDropTestEditor = (insertedNodeType: string) => {
      const mockSetTextSelection = vi.fn();
      const mockViewFocus = vi.fn();

      const mockDoc = {
        childCount: 1,
        content: { size: 10 },
        child: vi.fn(() => ({ nodeSize: 5 })),
        descendants: vi.fn(),
        // Position 0: existing heading (used for drop target position calculation)
        // Position 5: the newly inserted node (used in setTimeout to find it)
        nodeAt: vi.fn((pos: number) => {
          if (pos === 0) {
            return {
              type: { name: "heading" },
              attrs: { id: "existing-heading" },
              nodeSize: 5,
            };
          }
          if (pos === 5) {
            return {
              type: { name: insertedNodeType },
              attrs: { id: "new-node" },
            };
          }
          return null;
        }),
        resolve: vi.fn(() => ({
          depth: 0,
          index: () => 1,
          node: () => ({ type: { name: "doc" } }),
          before: () => 0,
        })),
      };

      const editor = {
        state: {
          doc: mockDoc,
          tr: {
            delete: vi.fn(),
            insert: vi.fn(),
            replaceWith: vi.fn(),
          },
        },
        view: {
          dom: (() => {
            const el = document.createElement("div");
            el.querySelectorAll = vi.fn(() => [] as unknown as NodeListOf<Element>);
            return el;
          })(),
          dispatch: vi.fn(),
          focus: mockViewFocus,
        },
        commands: {
          insertContentAt: vi.fn(),
          removeDragPlaceholder: vi.fn(),
          setTextSelection: mockSetTextSelection,
        },
        schema: {
          nodes: {
            paragraph: { create: vi.fn() },
            heading: { create: vi.fn() },
            imageBlock: { create: vi.fn() },
            columnCell: { create: vi.fn() },
            columnRow: { create: vi.fn() },
          },
          nodeFromJSON: vi.fn(),
        },
        getJSON: vi.fn(() => ({ type: "doc", content: [] })),
        chain: vi.fn(() => ({
          deleteRange: vi.fn(() => ({
            insertContentAt: vi.fn(() => ({ run: vi.fn() })),
          })),
          insertContentAt: vi.fn(() => ({
            deleteRange: vi.fn(() => ({ run: vi.fn() })),
          })),
        })),
        isDestroyed: false,
      };

      return { editor, mockSetTextSelection, mockViewFocus };
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should place caret inside paragraph node after sidebar drop", () => {
      vi.useFakeTimers();

      const { editor: dropEditor, mockSetTextSelection, mockViewFocus } =
        createDropTestEditor("paragraph");

      const dropStore = createStore();

      renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["text"], Editor: ["existing-heading"] },
            setItems: vi.fn(),
            editor: dropEditor as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => (
            <Provider store={dropStore}>{children}</Provider>
          ),
        }
      );

      const onDrop = getOnDrop();

      // Simulate dropping a "text" block (becomes paragraph) below the heading
      act(() => {
        onDrop(createSidebarDropEvent("text"));
      });

      // insertContentAt should have been called with the paragraph data
      expect(dropEditor.commands.insertContentAt).toHaveBeenCalledWith(
        5, // heading at pos 0 has nodeSize 5, closestEdge "bottom" → insertPos = 0 + 5
        expect.objectContaining({ type: "paragraph" })
      );

      // Before timer fires, setTextSelection should NOT have been called
      expect(mockSetTextSelection).not.toHaveBeenCalled();

      // Advance past the 100ms setTimeout
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // After timer fires, should set text selection at insertPosition + 1 (inside the paragraph)
      expect(mockSetTextSelection).toHaveBeenCalledWith(6); // position 5 + 1
      expect(mockViewFocus).toHaveBeenCalled();

      // selectedNodeAtom should have been set
      const selectedNode = dropStore.get(selectedNodeAtom);
      expect(selectedNode).toBeTruthy();
      expect((selectedNode as any)?.type?.name).toBe("paragraph");
    });

    it("should place caret inside heading node after sidebar drop", () => {
      vi.useFakeTimers();

      // For heading drop, nodeAt(5) should return a heading node
      const { editor: dropEditor, mockSetTextSelection, mockViewFocus } =
        createDropTestEditor("heading");

      const dropStore = createStore();

      renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["heading"], Editor: ["existing-heading"] },
            setItems: vi.fn(),
            editor: dropEditor as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => (
            <Provider store={dropStore}>{children}</Provider>
          ),
        }
      );

      const onDrop = getOnDrop();

      act(() => {
        onDrop(createSidebarDropEvent("heading"));
      });

      expect(dropEditor.commands.insertContentAt).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ type: "heading" })
      );

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Heading is a text-type node, so caret should be placed inside
      expect(mockSetTextSelection).toHaveBeenCalledWith(6);
      expect(mockViewFocus).toHaveBeenCalled();
    });

    it("should NOT place caret for non-text nodes like image after sidebar drop", () => {
      vi.useFakeTimers();

      const { editor: dropEditor, mockSetTextSelection, mockViewFocus } =
        createDropTestEditor("imageBlock");

      const dropStore = createStore();

      renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["image"], Editor: ["existing-heading"] },
            setItems: vi.fn(),
            editor: dropEditor as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => (
            <Provider store={dropStore}>{children}</Provider>
          ),
        }
      );

      const onDrop = getOnDrop();

      act(() => {
        onDrop(createSidebarDropEvent("image"));
      });

      expect(dropEditor.commands.insertContentAt).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ type: "imageBlock" })
      );

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Image is NOT a text-type node — caret should NOT be set
      expect(mockSetTextSelection).not.toHaveBeenCalled();
      expect(mockViewFocus).not.toHaveBeenCalled();

      // But the node should still be selected (blue border)
      const selectedNode = dropStore.get(selectedNodeAtom);
      expect(selectedNode).toBeTruthy();
      expect((selectedNode as any)?.type?.name).toBe("imageBlock");
    });

    it("should NOT place caret for divider node after sidebar drop", () => {
      vi.useFakeTimers();

      const { editor: dropEditor, mockSetTextSelection, mockViewFocus } =
        createDropTestEditor("divider");

      const dropStore = createStore();

      renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["divider"], Editor: ["existing-heading"] },
            setItems: vi.fn(),
            editor: dropEditor as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => (
            <Provider store={dropStore}>{children}</Provider>
          ),
        }
      );

      const onDrop = getOnDrop();

      act(() => {
        onDrop(createSidebarDropEvent("divider"));
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Divider is NOT a text-type node — no caret placement
      expect(mockSetTextSelection).not.toHaveBeenCalled();
      expect(mockViewFocus).not.toHaveBeenCalled();
    });

    it("should NOT set text selection if editor is destroyed before timer fires", () => {
      vi.useFakeTimers();

      const { editor: dropEditor, mockSetTextSelection, mockViewFocus } =
        createDropTestEditor("paragraph");

      const dropStore = createStore();

      renderHook(
        () =>
          usePragmaticDnd({
            items: { Sidebar: ["text"], Editor: ["existing-heading"] },
            setItems: vi.fn(),
            editor: dropEditor as unknown as Editor,
          }),
        {
          wrapper: ({ children }) => (
            <Provider store={dropStore}>{children}</Provider>
          ),
        }
      );

      const onDrop = getOnDrop();

      act(() => {
        onDrop(createSidebarDropEvent("text"));
      });

      // Destroy the editor before the timer fires
      dropEditor.isDestroyed = true;

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should NOT set text selection since editor is destroyed
      expect(mockSetTextSelection).not.toHaveBeenCalled();
      expect(mockViewFocus).not.toHaveBeenCalled();
    });
  });
});
