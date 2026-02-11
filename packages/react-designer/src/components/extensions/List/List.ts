import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import { defaultListProps, type ListProps } from "./List.types";
import { ListComponentNode } from "./ListComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    list: {
      setList: (props?: Partial<ListProps>) => ReturnType;
      toggleOrderedList: () => ReturnType;
      toggleUnorderedList: () => ReturnType;
    };
  }
}

export { defaultListProps };

export const List = Node.create({
  name: "list",
  group: "block",
  content: "listItem+",
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      id: {
        default: () => `node-${uuidv4()}`,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
          "data-node-id": attributes.id,
        }),
      },
      listType: {
        default: defaultListProps.listType,
        parseHTML: (element) => {
          // Detect from tag name (ol vs ul)
          if (element.tagName.toLowerCase() === "ol") return "ordered";
          if (element.tagName.toLowerCase() === "ul") return "unordered";
          return element.getAttribute("data-list-type") || "unordered";
        },
        renderHTML: (attributes) => ({
          "data-list-type": attributes.listType,
        }),
      },
      borderColor: {
        default: defaultListProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
      paddingVertical: {
        default: defaultListProps.paddingVertical,
        parseHTML: (element) => element.getAttribute("data-padding-vertical"),
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      paddingHorizontal: {
        default: defaultListProps.paddingHorizontal,
        parseHTML: (element) => element.getAttribute("data-padding-horizontal"),
        renderHTML: (attributes) => ({
          "data-padding-horizontal": attributes.paddingHorizontal,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "ul", attrs: { listType: "unordered" } },
      { tag: "ol", attrs: { listType: "ordered" } },
      { tag: 'div[data-type="list"]' },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const tag = node.attrs.listType === "ordered" ? "ol" : "ul";
    return [
      tag,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "list",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ListComponentNode);
  },

  addKeyboardShortcuts() {
    // Maximum nesting depth for lists (backend supports 5 levels)
    const MAX_LIST_DEPTH = 5;

    return {
      // Tab to indent list item (create nested list)
      Tab: ({ editor }) => {
        if (!editor.isActive("listItem")) return false;

        // Check current nesting depth and get the parent list's type
        const { $from } = editor.state.selection;
        let listDepth = 0;
        let parentListType: string | null = null;

        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "list") {
            listDepth++;
            // Get the closest (innermost) list's type
            if (parentListType === null) {
              parentListType = $from.node(d).attrs.listType || "unordered";
            }
          }
        }

        // If already at max depth, don't allow further nesting
        if (listDepth >= MAX_LIST_DEPTH) {
          return true; // Still return true to prevent default Tab behavior
        }

        // Try to sink the list item
        // Note: List type inheritance is handled by appendTransaction plugin
        editor.commands.sinkListItem("listItem");
        return true;
      },
      // Shift+Tab to outdent list item
      "Shift-Tab": ({ editor }) => {
        if (!editor.isActive("listItem")) return false;
        // Try to lift, but always return true to prevent default Shift+Tab behavior in lists
        editor.commands.liftListItem("listItem");
        return true;
      },
      // Enter to create new list item
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;

        // Check if we're inside a list item and find both list and listItem depths
        // Also count total list nesting depth
        let listItemDepth = -1;
        let listDepth = -1;
        let totalListDepth = 0;

        for (let d = $from.depth; d >= 0; d--) {
          const node = $from.node(d);
          if (node.type.name === "listItem" && listItemDepth === -1) {
            listItemDepth = d;
          }
          if (node.type.name === "list") {
            if (listDepth === -1) {
              listDepth = d;
            }
            totalListDepth++;
          }
        }

        // Not in a list item
        if (listItemDepth === -1 || listDepth === -1) return false;

        // Get the list item and list nodes
        const listItemNode = $from.node(listItemDepth);
        const listNode = $from.node(listDepth);

        // Check if the list item is empty and selection is empty
        const isListItemEmpty = listItemNode.textContent.length === 0;

        if (empty && isListItemEmpty) {
          // Check if we're in a nested list (depth > 1)
          const isNestedList = totalListDepth > 1;

          if (isNestedList) {
            // In a nested list - lift the item to the parent list level
            return editor.commands.liftListItem("listItem");
          }

          // Top-level list - check if it's the only item or in the middle
          const isOnlyItem = listNode.childCount === 1;

          if (isOnlyItem) {
            // Only item - keep it (prevent deletion of the list structure)
            return true;
          }

          // Multiple items - delete this empty item and keep the list intact
          const listItemIndex = $from.index(listDepth);
          const listItemStart = $from.before(listItemDepth);
          const listItemEnd = $from.after(listItemDepth);

          // Check if this is the last item
          const isLastItem = listItemIndex === listNode.childCount - 1;

          if (isLastItem) {
            // Last item - keep it (stay in the list)
            return true;
          }

          // Middle or first item - delete it and move cursor to next item
          editor.chain().focus().deleteRange({ from: listItemStart, to: listItemEnd }).run();
          return true;
        }

        // Non-empty list item - split normally to create a new item
        return editor.commands.splitListItem("listItem");
      },
      // Backspace at start of list item to outdent or exit
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;

        // Only handle if selection is empty and at the start of a text block
        if (!empty || $from.parentOffset !== 0) return false;

        // Check if we're inside a list item and find both list and listItem depths
        // Also count total list nesting depth
        let listItemDepth = -1;
        let listDepth = -1;
        let totalListDepth = 0;

        for (let d = $from.depth; d >= 0; d--) {
          const node = $from.node(d);
          if (node.type.name === "listItem" && listItemDepth === -1) {
            listItemDepth = d;
          }
          if (node.type.name === "list") {
            if (listDepth === -1) {
              listDepth = d;
            }
            totalListDepth++;
          }
        }

        // Not in a list item
        if (listItemDepth === -1 || listDepth === -1) return false;

        // Get the list item and list nodes
        const listItemNode = $from.node(listItemDepth);
        const listNode = $from.node(listDepth);

        // Check if the list item is empty
        const isListItemEmpty = listItemNode.textContent.length === 0;

        // Find the index of the current list item within the list
        const listItemIndex = $from.index(listDepth);

        // Check if we're in a nested list
        const isNestedList = totalListDepth > 1;

        // Handle non-empty list items
        if (!isListItemEmpty) {
          if (listItemIndex === 0) {
            // First item - don't allow lifting out (keep it in the list)
            return true;
          }

          // Not the first item - manually merge with previous item
          const { state, view } = editor;
          const tr = state.tr;

          // Get current list item boundaries
          const listItemStart = $from.before(listItemDepth);
          const listItemEnd = $from.after(listItemDepth);

          // Get the paragraph/heading content inside the current list item
          const currentListItemFirstChild = listItemNode.firstChild;
          if (!currentListItemFirstChild) {
            return false;
          }

          // Find the previous list item by going back from current list item
          const prevListItemPos = listItemStart - 2;
          if (prevListItemPos < 0) {
            return false;
          }

          const $prevListItemPos = state.doc.resolve(prevListItemPos);

          // Find the previous list item depth
          let prevListItemDepth = -1;
          for (let d = $prevListItemPos.depth; d >= 0; d--) {
            if ($prevListItemPos.node(d).type.name === "listItem") {
              prevListItemDepth = d;
              break;
            }
          }

          if (prevListItemDepth === -1) {
            return false;
          }

          const prevListItemNode = $prevListItemPos.node(prevListItemDepth);
          const prevListItemFirstChild = prevListItemNode.firstChild;

          if (!prevListItemFirstChild) {
            return false;
          }

          // Get the end position of the paragraph inside the previous list item
          // This is where we want to insert the content
          const prevListItemStart = $prevListItemPos.before(prevListItemDepth);
          const prevParagraphEnd = prevListItemStart + 1 + prevListItemFirstChild.nodeSize - 1;

          // Get the content to merge (just the inline content, not the paragraph wrapper)
          const currentContent = currentListItemFirstChild.content;

          // Step 1: Delete the current list item
          tr.delete(listItemStart, listItemEnd);

          // Step 2: Insert the content at the end of the previous paragraph
          tr.insert(prevParagraphEnd, currentContent);

          // Step 3: Set cursor at the merge point
          tr.setSelection(TextSelection.near(tr.doc.resolve(prevParagraphEnd)));

          view.dispatch(tr);
          return true;
        }

        // Check if this is the only item in the list
        const isOnlyItem = listNode.childCount === 1;

        if (isOnlyItem) {
          if (isNestedList) {
            // In a nested list with only one empty item - lift to parent (same as Enter)
            return editor.commands.liftListItem("listItem");
          }
          // Top-level list: Keep the last list item (prevent accidental deletion of the list structure)
          // User must explicitly delete the block to remove the list
          return true;
        }

        // Delete just this empty list item
        const listItemStart = $from.before(listItemDepth);
        const listItemEnd = $from.after(listItemDepth);

        // If this is NOT the first item, we want to move cursor to the end of the previous item
        if (listItemIndex > 0) {
          // Find the previous list item
          const prevListItemPos = listItemStart - 2;
          if (prevListItemPos < 0) {
            return false;
          }

          const $prevListItemPos = editor.state.doc.resolve(prevListItemPos);

          // Find the previous list item depth
          let prevListItemDepth = -1;
          for (let d = $prevListItemPos.depth; d >= 0; d--) {
            if ($prevListItemPos.node(d).type.name === "listItem") {
              prevListItemDepth = d;
              break;
            }
          }

          if (prevListItemDepth === -1) {
            return false;
          }

          const prevListItemNode = $prevListItemPos.node(prevListItemDepth);
          const prevListItemFirstChild = prevListItemNode.firstChild;

          if (!prevListItemFirstChild) {
            return false;
          }

          // Get the end position of the paragraph inside the previous list item
          const prevListItemStart = $prevListItemPos.before(prevListItemDepth);
          const prevParagraphEnd = prevListItemStart + 1 + prevListItemFirstChild.nodeSize - 1;

          // Delete the current item and set cursor at the end of previous item
          editor
            .chain()
            .focus()
            .deleteRange({ from: listItemStart, to: listItemEnd })
            .setTextSelection(prevParagraphEnd)
            .run();
        } else {
          // First item - just delete and cursor will go to next item
          editor.chain().focus().deleteRange({ from: listItemStart, to: listItemEnd }).run();
        }
        return true;
      },
    };
  },

  addCommands() {
    return {
      setList:
        (props = {}) =>
        ({ chain }) => {
          const listType = props.listType || "unordered";
          return chain()
            .insertContent({
              type: this.name,
              attrs: { listType, ...props },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [] }],
                },
              ],
            })
            .run();
        },
      toggleOrderedList:
        () =>
        ({ commands, editor }) => {
          if (editor.isActive("list", { listType: "ordered" })) {
            // Already in ordered list - do nothing (stay ordered)
            return true;
          }
          if (editor.isActive("list", { listType: "unordered" })) {
            // Toggle from unordered to ordered
            return commands.updateAttributes("list", { listType: "ordered" });
          }

          // Not in a list - do nothing (can't convert text to list)
          return false;
        },
      toggleUnorderedList:
        () =>
        ({ commands, editor }) => {
          if (editor.isActive("list", { listType: "unordered" })) {
            // Already in unordered list - do nothing (stay unordered)
            return true;
          }
          if (editor.isActive("list", { listType: "ordered" })) {
            // Toggle from ordered to unordered
            return commands.updateAttributes("list", { listType: "unordered" });
          }

          // Not in a list - do nothing (can't convert text to list)
          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("nestedListUnordered"),
        appendTransaction: (transactions, _oldState, newState) => {
          // Only process if there were actual document changes
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const { tr } = newState;
          let modified = false;

          // Nested lists should always be unordered — only the top-level
          // list type is user-configurable.
          newState.doc.descendants((node, pos, parent) => {
            if (
              node.type.name === "list" &&
              parent?.type.name === "listItem" &&
              node.attrs.listType !== "unordered"
            ) {
              try {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  listType: "unordered",
                });
                modified = true;
              } catch {
                // Silently ignore setNodeMarkup failures on complex nested structures
              }
            }
            return true;
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export default List;
