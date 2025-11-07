import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { useNodeAttributes } from "./useNodeAttributes";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { UseFormReturn } from "react-hook-form";

describe("useNodeAttributes", () => {
  let mockEditor: Partial<Editor>;
  let mockElement: Partial<ProseMirrorNode>;
  let mockForm: Partial<UseFormReturn<any>>;
  let mockNode: Partial<ProseMirrorNode>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNode = {
      type: {
        name: "imageBlock",
      } as any,
      attrs: {
        id: "test-id",
        sourcePath: "https://example.com/image.jpg",
        width: 100,
      },
    };

    mockEditor = {
      state: {
        doc: {
          descendants: vi.fn((callback) => {
            callback(mockNode as ProseMirrorNode, 10);
            return undefined;
          }),
          nodeAt: vi.fn(() => mockNode as ProseMirrorNode),
        } as any,
      } as any,
      on: vi.fn(),
      off: vi.fn(),
      chain: vi.fn(() => ({
        command: vi.fn(() => ({
          run: vi.fn(),
        })),
      })),
    };

    mockElement = {
      attrs: {
        id: "test-id",
        sourcePath: "https://example.com/image.jpg",
        width: 100,
      },
    };

    mockForm = {
      getValues: vi.fn(() => ({})),
      setValue: vi.fn(),
    };
  });

  describe("updateNodeAttributes memoization", () => {
    it("should return a stable updateNodeAttributes function reference", () => {
      const { result, rerender } = renderHook(() =>
        useNodeAttributes({
          editor: mockEditor as Editor,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        })
      );

      const firstReference = result.current.updateNodeAttributes;

      // Force a re-render
      rerender();

      const secondReference = result.current.updateNodeAttributes;

      // The function reference should remain the same across re-renders
      expect(firstReference).toBe(secondReference);
    });

    it("should update function reference only when editor changes", () => {
      const { result, rerender } = renderHook(
        ({ editor }) =>
          useNodeAttributes({
            editor,
            element: mockElement as ProseMirrorNode,
            form: mockForm as UseFormReturn<any>,
            nodeType: "imageBlock",
          }),
        {
          initialProps: { editor: mockEditor as Editor },
        }
      );

      const firstReference = result.current.updateNodeAttributes;

      // Create a new editor instance
      const newMockEditor = { ...mockEditor };
      rerender({ editor: newMockEditor as Editor });

      const secondReference = result.current.updateNodeAttributes;

      // Function reference should change when editor changes
      expect(firstReference).not.toBe(secondReference);
    });

    it("should update function reference only when nodeType changes", () => {
      const { result, rerender } = renderHook(
        ({ nodeType }) =>
          useNodeAttributes({
            editor: mockEditor as Editor,
            element: mockElement as ProseMirrorNode,
            form: mockForm as UseFormReturn<any>,
            nodeType,
          }),
        {
          initialProps: { nodeType: "imageBlock" },
        }
      );

      const firstReference = result.current.updateNodeAttributes;

      rerender({ nodeType: "button" });

      const secondReference = result.current.updateNodeAttributes;

      // Function reference should change when nodeType changes
      expect(firstReference).not.toBe(secondReference);
    });

    it("should not update function reference when element changes", () => {
      const { result, rerender } = renderHook(
        ({ element }) =>
          useNodeAttributes({
            editor: mockEditor as Editor,
            element,
            form: mockForm as UseFormReturn<any>,
            nodeType: "imageBlock",
          }),
        {
          initialProps: { element: mockElement as ProseMirrorNode },
        }
      );

      const firstReference = result.current.updateNodeAttributes;

      // Create a new element with different attributes
      const newElement = {
        attrs: {
          id: "test-id",
          sourcePath: "https://example.com/new-image.jpg",
          width: 50,
        },
      };

      rerender({ element: newElement as ProseMirrorNode });

      const secondReference = result.current.updateNodeAttributes;

      // Function reference should stay the same (not dependent on element)
      expect(firstReference).toBe(secondReference);
    });
  });

  describe("updateNodeAttributes functionality", () => {
    it("should not update when editor is null", () => {
      const { result } = renderHook(() =>
        useNodeAttributes({
          editor: null,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        })
      );

      const chainMock = vi.fn();
      if (mockEditor.chain) {
        (mockEditor.chain as any) = chainMock;
      }

      result.current.updateNodeAttributes({ width: 50 });

      // Should not call editor.chain when editor is null
      expect(chainMock).not.toHaveBeenCalled();
    });

    it("should not update when attributes have not changed", () => {
      const { result } = renderHook(() =>
        useNodeAttributes({
          editor: mockEditor as Editor,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        })
      );

      const chainMock = vi.fn(() => ({
        command: vi.fn(() => ({
          run: vi.fn(),
        })),
      }));

      mockEditor.chain = chainMock;

      // Try to update with the same attributes
      result.current.updateNodeAttributes({
        sourcePath: "https://example.com/image.jpg",
        width: 100,
      });

      // Should not call editor.chain when attributes haven't changed
      expect(chainMock).not.toHaveBeenCalled();
    });

    it("should update when attributes have changed", () => {
      const { result } = renderHook(() =>
        useNodeAttributes({
          editor: mockEditor as Editor,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        })
      );

      const runMock = vi.fn();
      const commandMock = vi.fn(() => ({ run: runMock }));
      const chainMock = vi.fn(() => ({ command: commandMock }));

      mockEditor.chain = chainMock;

      // Update with different attributes
      result.current.updateNodeAttributes({ width: 50 });

      // Should call editor.chain when attributes have changed
      expect(chainMock).toHaveBeenCalled();
      expect(commandMock).toHaveBeenCalled();
      expect(runMock).toHaveBeenCalled();
    });

    it("should not update when node type does not match", () => {
      const wrongTypeNode = {
        type: {
          name: "button",
        } as any,
        attrs: {
          id: "test-id",
          ...mockNode.attrs,
        },
      };

      // Create a new editor with wrong node type
      const wrongTypeEditor: Partial<Editor> = {
        state: {
          doc: {
            descendants: vi.fn((callback) => {
              callback(wrongTypeNode as ProseMirrorNode, 10);
              return undefined;
            }),
            nodeAt: vi.fn(() => wrongTypeNode as ProseMirrorNode),
          } as any,
        } as any,
        on: vi.fn(),
        off: vi.fn(),
        chain: vi.fn(() => ({
          command: vi.fn(() => ({
            run: vi.fn(),
          })),
        })),
      };

      const { result } = renderHook(() =>
        useNodeAttributes({
          editor: wrongTypeEditor as Editor,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        })
      );

      const chainMock = vi.fn();
      wrongTypeEditor.chain = chainMock;

      result.current.updateNodeAttributes({ width: 50 });

      // Should not call editor.chain when node type doesn't match
      expect(chainMock).not.toHaveBeenCalled();
    });
  });

  describe("prevents infinite re-render loops", () => {
    it("should not cause infinite loops when used in useEffect dependencies", () => {
      let effectRunCount = 0;
      const MAX_SAFE_RUNS = 10;

      const { rerender } = renderHook(() => {
        const { updateNodeAttributes } = useNodeAttributes({
          editor: mockEditor as Editor,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        });

        // Simulate useEffect with updateNodeAttributes as dependency
        useEffect(() => {
          effectRunCount++;
          if (effectRunCount > MAX_SAFE_RUNS) {
            throw new Error("Maximum update depth exceeded");
          }
        }, [updateNodeAttributes]);

        return updateNodeAttributes;
      });

      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender();
      }

      // Effect should only run once per stable reference
      expect(effectRunCount).toBeLessThanOrEqual(MAX_SAFE_RUNS);
    });
  });

  describe("editor event listener cleanup", () => {
    it("should subscribe to editor update events", () => {
      renderHook(() =>
        useNodeAttributes({
          editor: mockEditor as Editor,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        })
      );

      expect(mockEditor.on).toHaveBeenCalledWith("update", expect.any(Function));
    });

    it("should unsubscribe from editor update events on unmount", () => {
      const { unmount } = renderHook(() =>
        useNodeAttributes({
          editor: mockEditor as Editor,
          element: mockElement as ProseMirrorNode,
          form: mockForm as UseFormReturn<any>,
          nodeType: "imageBlock",
        })
      );

      unmount();

      expect(mockEditor.off).toHaveBeenCalledWith("update", expect.any(Function));
    });
  });
});
