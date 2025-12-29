import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import type { ListProps } from "./List.types";
import { ListComponentNode } from "./ListComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    list: {
      setList: (props?: Partial<ListProps>) => ReturnType;
      toggleList: () => ReturnType;
      toggleOrderedList: () => ReturnType;
      toggleBulletList: () => ReturnType;
    };
  }
}

export const defaultListProps: ListProps = {
  listType: "unordered",
};

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
      locales: {
        default: undefined,
        parseHTML: () => undefined,
        renderHTML: () => ({}),
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
    return {
      // Tab to indent list item (create nested list)
      Tab: ({ editor }) => {
        if (!editor.isActive("list")) return false;
        return editor.commands.sinkListItem("listItem");
      },
      // Shift+Tab to outdent list item
      "Shift-Tab": ({ editor }) => {
        if (!editor.isActive("list")) return false;
        return editor.commands.liftListItem("listItem");
      },
      // Enter to create new list item
      Enter: ({ editor }) => {
        // Check if we're inside a list item
        const { $from } = editor.state.selection;
        let inListItem = false;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "listItem") {
            inListItem = true;
            break;
          }
        }
        if (!inListItem) return false;

        // Split the list item to create a new one
        return editor.commands.splitListItem("listItem");
      },
      // Backspace at start of list item to outdent or exit
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;

        // Only handle if selection is empty and at the start of a text block
        if (!empty || $from.parentOffset !== 0) return false;

        // Check if we're inside a list item and find both list and listItem depths
        let listItemDepth = -1;
        let listDepth = -1;
        for (let d = $from.depth; d >= 0; d--) {
          const node = $from.node(d);
          if (node.type.name === "listItem" && listItemDepth === -1) {
            listItemDepth = d;
          }
          if (node.type.name === "list") {
            listDepth = d;
            break;
          }
        }

        // Not in a list item
        if (listItemDepth === -1 || listDepth === -1) return false;

        // Get the list item and list nodes
        const listItemNode = $from.node(listItemDepth);
        const listNode = $from.node(listDepth);

        // Check if the list item is empty
        const isListItemEmpty = listItemNode.textContent.length === 0;

        // Only handle empty list items
        if (!isListItemEmpty) {
          // For non-empty items at start, try to lift
          return editor.commands.liftListItem("listItem");
        }

        // Check if this is the only item in the list
        const isOnlyItem = listNode.childCount === 1;

        if (isOnlyItem) {
          // Delete the entire list when the last item is empty
          const listStart = $from.before(listDepth);
          const listEnd = $from.after(listDepth);
          editor.chain().focus().deleteRange({ from: listStart, to: listEnd }).run();
          return true;
        }

        // Find the index of the current list item within the list
        const listItemIndex = $from.index(listDepth);

        // Delete just this empty list item
        const listItemStart = $from.before(listItemDepth);
        const listItemEnd = $from.after(listItemDepth);

        // If this is NOT the first item, we want to move cursor to the previous item
        if (listItemIndex > 0) {
          // Calculate the position of the end of the previous list item
          // After deletion, position will shift, so we need to set cursor before deleting
          const prevItemEnd = listItemStart - 1; // End of previous list item's content

          editor
            .chain()
            .focus()
            .deleteRange({ from: listItemStart, to: listItemEnd })
            .setTextSelection(prevItemEnd)
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
      toggleList:
        () =>
        ({ commands, editor }) => {
          if (editor.isActive("list")) {
            // If we're in a list, lift all items out
            return commands.liftListItem("listItem");
          }
          // Otherwise, wrap in a list
          return commands.wrapInList("list");
        },
      toggleOrderedList:
        () =>
        ({ commands, editor }) => {
          if (editor.isActive("list", { listType: "ordered" })) {
            return commands.liftListItem("listItem");
          }
          if (editor.isActive("list", { listType: "unordered" })) {
            // Toggle from unordered to ordered
            return commands.updateAttributes("list", { listType: "ordered" });
          }
          return commands.wrapInList("list", { listType: "ordered" });
        },
      toggleBulletList:
        () =>
        ({ commands, editor }) => {
          if (editor.isActive("list", { listType: "unordered" })) {
            return commands.liftListItem("listItem");
          }
          if (editor.isActive("list", { listType: "ordered" })) {
            // Toggle from ordered to unordered
            return commands.updateAttributes("list", { listType: "unordered" });
          }
          return commands.wrapInList("list", { listType: "unordered" });
        },
    };
  },
});

export default List;
