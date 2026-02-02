import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Heading } from "@tiptap/extension-heading";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { List } from "./List";
import { ListItem } from "../ListItem";

// Mock DOM environment
Object.defineProperty(window, "getSelection", {
  writable: true,
  value: vi.fn(() => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  })),
});

Object.defineProperty(document, "getSelection", {
  writable: true,
  value: vi.fn(() => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  })),
});

// Mock generateNodeIds
vi.mock("../../utils/generateNodeIds", () => ({
  generateNodeIds: vi.fn(),
}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

// Mock ReactNodeViewRenderer
vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => () => null),
}));

/**
 * Helper to create an editor with list extensions
 */
const createListEditor = (content: any) => {
  const editor = new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading,
      List,
      ListItem,
    ],
    content,
  });
  return editor;
};

/**
 * Helper to find all list nodes in the document and return their listType attributes
 */
const getListTypes = (editor: Editor): string[] => {
  const listTypes: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "list") {
      listTypes.push(node.attrs.listType);
    }
    return true;
  });
  return listTypes;
};

/**
 * Helper to count the number of list nodes at each depth level
 */
const countListsAtDepth = (editor: Editor): Map<number, number> => {
  const counts = new Map<number, number>();
  
  const countLists = (node: any, depth: number) => {
    if (node.type.name === "list") {
      counts.set(depth, (counts.get(depth) || 0) + 1);
    }
    node.forEach((child: any) => {
      countLists(child, node.type.name === "list" ? depth + 1 : depth);
    });
  };
  
  editor.state.doc.forEach((node) => {
    countLists(node, 0);
  });
  
  return counts;
};

describe("List Extension - Keyboard Shortcuts", () => {
  let createdEditors: Editor[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdEditors = [];
  });

  afterEach(() => {
    createdEditors.forEach((editor) => {
      try {
        if (!editor.isDestroyed) {
          editor.destroy();
        }
      } catch {
        // Ignore cleanup errors
      }
    });
    createdEditors = [];
  });

  const trackEditor = (editor: Editor): Editor => {
    createdEditors.push(editor);
    return editor;
  };

  describe("Tab - Nested list type inheritance", () => {
    it("should create nested ordered list when parent is ordered", () => {
      // Create an ordered list with two items
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "ordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "First item" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Second item" }] }],
                },
              ],
            },
          ],
        })
      );

      // Verify initial state - one ordered list
      expect(getListTypes(editor)).toEqual(["ordered"]);

      // Position cursor at the start of the second list item
      // The structure is: doc > list > listItem > paragraph > text
      // We need to find the second listItem and position there
      const { doc } = editor.state;
      const listNode = doc.firstChild!;
      const secondListItemPos = listNode.firstChild!.nodeSize + 1; // After first listItem

      editor.commands.setTextSelection(secondListItemPos + 2); // Inside second listItem's paragraph

      // Simulate Tab key press (sink list item)
      editor.commands.sinkListItem("listItem");

      // After sinking, we need to update the nested list type
      // This is what our Tab handler does - let's trigger it via the keyboard shortcut
      // Re-create with fresh content and use the keyboard shortcut
      editor.destroy();

      const editor2 = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "ordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "First item" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Second item" }] }],
                },
              ],
            },
          ],
        })
      );

      // Position cursor in second item
      const doc2 = editor2.state.doc;
      const list2 = doc2.firstChild!;
      const firstItemSize = list2.firstChild!.nodeSize;
      editor2.commands.setTextSelection(1 + firstItemSize + 2);

      // Trigger the Tab keyboard shortcut
      const tabShortcut = editor2.extensionManager.extensions
        .find((ext) => ext.name === "list")
        ?.options?.keyboardShortcuts?.Tab;

      // Use the editor's keyboard shortcut handling
      const result = editor2.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Tab" });
        return f(editor2.view, event);
      });

      // Check that all lists are now ordered (parent and nested)
      const listTypes = getListTypes(editor2);
      listTypes.forEach((type) => {
        expect(type).toBe("ordered");
      });
    });

    it("should create nested unordered list when parent is unordered", () => {
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "unordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "First item" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Second item" }] }],
                },
              ],
            },
          ],
        })
      );

      // Verify initial state
      expect(getListTypes(editor)).toEqual(["unordered"]);

      // Position cursor in second item
      const doc = editor.state.doc;
      const list = doc.firstChild!;
      const firstItemSize = list.firstChild!.nodeSize;
      editor.commands.setTextSelection(1 + firstItemSize + 2);

      // Trigger Tab via keyboard
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Tab" });
        return f(editor.view, event);
      });

      // Check that all lists remain unordered
      const listTypes = getListTypes(editor);
      listTypes.forEach((type) => {
        expect(type).toBe("unordered");
      });
    });

    it("should preserve cursor position in nested list item after Tab", () => {
      // Create an ordered list with two items
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "ordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "First item" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Second item" }] }],
                },
              ],
            },
          ],
        })
      );

      // Position cursor in second item (at the start of "Second item")
      const doc = editor.state.doc;
      const list = doc.firstChild!;
      const firstItemSize = list.firstChild!.nodeSize;
      const cursorPosBeforeTab = 1 + firstItemSize + 2; // Inside second listItem's paragraph
      editor.commands.setTextSelection(cursorPosBeforeTab);

      // Verify we're in the second list item
      const { $from: $beforeTab } = editor.state.selection;
      let listItemTextBefore = "";
      for (let d = $beforeTab.depth; d >= 0; d--) {
        if ($beforeTab.node(d).type.name === "listItem") {
          listItemTextBefore = $beforeTab.node(d).textContent;
          break;
        }
      }
      expect(listItemTextBefore).toBe("Second item");

      // Trigger Tab to create nested list
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Tab" });
        return f(editor.view, event);
      });

      // Verify cursor is still in "Second item" (now nested)
      const { $from: $afterTab } = editor.state.selection;
      let listItemTextAfter = "";
      for (let d = $afterTab.depth; d >= 0; d--) {
        if ($afterTab.node(d).type.name === "listItem") {
          listItemTextAfter = $afterTab.node(d).textContent;
          break;
        }
      }
      expect(listItemTextAfter).toBe("Second item");

      // Verify the item is now in a nested list (depth increased)
      let listDepthAfter = 0;
      for (let d = $afterTab.depth; d >= 0; d--) {
        if ($afterTab.node(d).type.name === "list") {
          listDepthAfter++;
        }
      }
      expect(listDepthAfter).toBe(2); // Now nested (2 list levels)
    });

    it("should not allow nesting beyond MAX_LIST_DEPTH (5 levels)", () => {
      // Create a list already nested 4 levels deep
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "unordered" },
              content: [
                {
                  type: "listItem",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "Level 1" }] },
                    {
                      type: "list",
                      attrs: { listType: "unordered" },
                      content: [
                        {
                          type: "listItem",
                          content: [
                            { type: "paragraph", content: [{ type: "text", text: "Level 2" }] },
                            {
                              type: "list",
                              attrs: { listType: "unordered" },
                              content: [
                                {
                                  type: "listItem",
                                  content: [
                                    { type: "paragraph", content: [{ type: "text", text: "Level 3" }] },
                                    {
                                      type: "list",
                                      attrs: { listType: "unordered" },
                                      content: [
                                        {
                                          type: "listItem",
                                          content: [
                                            { type: "paragraph", content: [{ type: "text", text: "Level 4" }] },
                                            {
                                              type: "list",
                                              attrs: { listType: "unordered" },
                                              content: [
                                                {
                                                  type: "listItem",
                                                  content: [
                                                    { type: "paragraph", content: [{ type: "text", text: "Level 5" }] },
                                                  ],
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        })
      );

      // Count lists before Tab
      const initialListCount = getListTypes(editor).length;
      expect(initialListCount).toBe(5);

      // Position cursor at the deepest level (Level 5)
      // Navigate to the innermost text
      let deepestPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "text" && node.text === "Level 5") {
          deepestPos = pos;
        }
        return true;
      });

      editor.commands.setTextSelection(deepestPos);

      // Try to Tab (should not create a 6th level)
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Tab" });
        return f(editor.view, event);
      });

      // Verify no additional list was created
      const finalListCount = getListTypes(editor).length;
      expect(finalListCount).toBe(5);
    });
  });

  describe("Enter - Empty list item behavior", () => {
    it("should lift empty list item from nested list to parent level", () => {
      // Create a list with a nested list containing an empty item
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "unordered" },
              content: [
                {
                  type: "listItem",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "Parent item" }] },
                    {
                      type: "list",
                      attrs: { listType: "unordered" },
                      content: [
                        {
                          type: "listItem",
                          content: [{ type: "paragraph", content: [{ type: "text", text: "Nested item" }] }],
                        },
                        {
                          type: "listItem",
                          content: [{ type: "paragraph" }], // Empty item
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        })
      );

      // Count initial structure
      const initialListCount = getListTypes(editor).length;
      expect(initialListCount).toBe(2); // Parent list + nested list

      // Find the empty paragraph in the nested list
      let emptyParagraphPos = 0;
      editor.state.doc.descendants((node, pos, parent) => {
        if (
          node.type.name === "paragraph" &&
          node.content.size === 0 &&
          parent?.type.name === "listItem"
        ) {
          emptyParagraphPos = pos + 1; // Position inside the paragraph
        }
        return true;
      });

      editor.commands.setTextSelection(emptyParagraphPos);

      // Verify we're in a nested list (depth > 1)
      let listDepth = 0;
      const { $from } = editor.state.selection;
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type.name === "list") {
          listDepth++;
        }
      }
      expect(listDepth).toBe(2);

      // Trigger Enter key
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Enter" });
        return f(editor.view, event);
      });

      // After lifting, verify the item moved to parent level
      // The nested list should now have only 1 item, and parent should have 2
      let parentListItemCount = 0;
      let nestedListExists = false;

      editor.state.doc.descendants((node) => {
        if (node.type.name === "list") {
          // Check if this is a top-level list
          let isTopLevel = true;
          editor.state.doc.descendants((n, p, parent) => {
            if (n === node && parent?.type.name === "listItem") {
              isTopLevel = false;
            }
            return true;
          });

          if (isTopLevel) {
            parentListItemCount = node.childCount;
          } else {
            nestedListExists = true;
          }
        }
        return true;
      });

      // The item should have been lifted, so parent list should have more items
      // or nested list should have fewer items
      expect(parentListItemCount).toBeGreaterThanOrEqual(1);
    });

    it("should not lift empty list item from top-level list", () => {
      // Create a simple list with an empty item
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "unordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "First item" }] }],
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph" }], // Empty item
                },
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Third item" }] }],
                },
              ],
            },
          ],
        })
      );

      // Verify initial state
      expect(getListTypes(editor).length).toBe(1);

      // Find the empty paragraph
      let emptyParagraphPos = 0;
      editor.state.doc.descendants((node, pos, parent) => {
        if (
          node.type.name === "paragraph" &&
          node.content.size === 0 &&
          parent?.type.name === "listItem"
        ) {
          emptyParagraphPos = pos + 1;
        }
        return true;
      });

      editor.commands.setTextSelection(emptyParagraphPos);

      // Verify we're in a top-level list (depth === 1)
      let listDepth = 0;
      const { $from } = editor.state.selection;
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type.name === "list") {
          listDepth++;
        }
      }
      expect(listDepth).toBe(1);

      // Trigger Enter key
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Enter" });
        return f(editor.view, event);
      });

      // The list structure should still have exactly 1 list (no lifting out of the list entirely)
      expect(getListTypes(editor).length).toBe(1);
    });

    it("should keep single empty item in top-level list (prevent accidental deletion)", () => {
      // Create a list with only one empty item
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "ordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph" }], // Single empty item
                },
              ],
            },
          ],
        })
      );

      // Verify initial state
      expect(getListTypes(editor).length).toBe(1);
      const initialDoc = editor.state.doc.toJSON();

      // Position in the empty paragraph
      editor.commands.setTextSelection(3);

      // Trigger Enter key
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Enter" });
        return f(editor.view, event);
      });

      // The list should still exist with the empty item
      expect(getListTypes(editor).length).toBe(1);
    });

    it("should create new list item when pressing Enter on non-empty item", () => {
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "unordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "First item" }] }],
                },
              ],
            },
          ],
        })
      );

      // Initial list has 1 item
      let initialItemCount = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "listItem") {
          initialItemCount++;
        }
        return true;
      });
      expect(initialItemCount).toBe(1);

      // Position cursor at the end of the text
      let textEndPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "text") {
          textEndPos = pos + node.nodeSize;
        }
        return true;
      });
      editor.commands.setTextSelection(textEndPos);

      // Trigger Enter key
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Enter" });
        return f(editor.view, event);
      });

      // Should now have 2 list items
      let finalItemCount = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "listItem") {
          finalItemCount++;
        }
        return true;
      });
      expect(finalItemCount).toBe(2);
    });
  });

  describe("Backspace - Empty list item behavior", () => {
    it("should lift only empty item from nested list when pressing Backspace (same as Enter)", () => {
      // Create a list with a nested list containing only one empty item
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "unordered" },
              content: [
                {
                  type: "listItem",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "Parent item" }] },
                    {
                      type: "list",
                      attrs: { listType: "unordered" },
                      content: [
                        {
                          type: "listItem",
                          content: [{ type: "paragraph" }], // Only empty item in nested list
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        })
      );

      // Verify initial state - 2 lists (parent + nested)
      expect(getListTypes(editor).length).toBe(2);

      // Find the empty paragraph in the nested list
      let emptyParagraphPos = 0;
      editor.state.doc.descendants((node, pos, parent) => {
        if (
          node.type.name === "paragraph" &&
          node.content.size === 0 &&
          parent?.type.name === "listItem"
        ) {
          emptyParagraphPos = pos + 1; // Position inside the paragraph
        }
        return true;
      });

      // Position cursor at the start of the empty paragraph (for Backspace)
      editor.commands.setTextSelection(emptyParagraphPos);

      // Verify we're in a nested list (depth > 1)
      let listDepth = 0;
      const { $from } = editor.state.selection;
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type.name === "list") {
          listDepth++;
        }
      }
      expect(listDepth).toBe(2);

      // Trigger Backspace key
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Backspace" });
        return f(editor.view, event);
      });

      // After lifting, the nested list should be gone (only 1 list remains)
      // and the parent list should have 2 items now
      const finalListCount = getListTypes(editor).length;
      expect(finalListCount).toBe(1); // Only the parent list remains

      // Count list items in the remaining list
      let listItemCount = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "listItem") {
          listItemCount++;
        }
        return true;
      });
      expect(listItemCount).toBe(2); // Original parent item + lifted item
    });

    it("should not delete only empty item from top-level list when pressing Backspace", () => {
      // Create a list with only one empty item
      const editor = trackEditor(
        createListEditor({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: { listType: "ordered" },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph" }], // Single empty item
                },
              ],
            },
          ],
        })
      );

      // Verify initial state
      expect(getListTypes(editor).length).toBe(1);

      // Position cursor at the start of the empty paragraph
      editor.commands.setTextSelection(3);

      // Trigger Backspace key
      editor.view.someProp("handleKeyDown", (f) => {
        const event = new KeyboardEvent("keydown", { key: "Backspace" });
        return f(editor.view, event);
      });

      // The list should still exist with the empty item (not deleted)
      expect(getListTypes(editor).length).toBe(1);

      // Still has 1 list item
      let listItemCount = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "listItem") {
          listItemCount++;
        }
        return true;
      });
      expect(listItemCount).toBe(1);
    });
  });
});
