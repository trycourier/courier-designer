import { mergeAttributes, Node } from "@tiptap/core";
import { splitListItem, liftListItem, sinkListItem, wrapInList } from "prosemirror-schema-list";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import type { ListItemProps } from "./ListItem.types";

// Declare the commands module augmentation
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    listItem: {
      /** Split the list item at the current cursor position */
      splitListItem: (typeOrName: string) => ReturnType;
      /** Lift the list item out of the list (outdent) */
      liftListItem: (typeOrName: string) => ReturnType;
      /** Sink the list item into a nested list (indent) */
      sinkListItem: (typeOrName: string) => ReturnType;
      /** Wrap selection in a list */
      wrapInList: (typeOrName: string, attrs?: Record<string, unknown>) => ReturnType;
    };
  }
}

export const defaultListItemProps: ListItemProps = {
  backgroundColor: "transparent",
};

/**
 * Custom ListItem extension with prosemirror-schema-list commands.
 *
 * Provides commands:
 * - splitListItem: Split list item at cursor (creates new bullet)
 * - liftListItem: Lift list item out of list (outdent)
 * - sinkListItem: Sink list item into nested list (indent)
 * - wrapInList: Wrap selection in a list
 *
 * Keyboard shortcuts:
 * - Enter: Split list item (handled in List extension)
 * - Tab: Sink list item (handled in List extension)
 * - Shift-Tab: Lift list item (handled in List extension)
 * - Shift-Enter: Add a hard break (new line within the paragraph)
 */
export const ListItem = Node.create({
  name: "listItem",
  content: "(paragraph | heading) block*",
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
      backgroundColor: {
        default: defaultListItemProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "li" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["li", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      splitListItem:
        (typeOrName) =>
        ({ state, dispatch }) => {
          const type = typeof typeOrName === "string" ? state.schema.nodes[typeOrName] : typeOrName;
          if (!type) return false;
          return splitListItem(type)(state, dispatch);
        },
      liftListItem:
        (typeOrName) =>
        ({ state, dispatch }) => {
          const type = typeof typeOrName === "string" ? state.schema.nodes[typeOrName] : typeOrName;
          if (!type) return false;
          return liftListItem(type)(state, dispatch);
        },
      sinkListItem:
        (typeOrName) =>
        ({ state, dispatch }) => {
          const type = typeof typeOrName === "string" ? state.schema.nodes[typeOrName] : typeOrName;
          if (!type) return false;
          return sinkListItem(type)(state, dispatch);
        },
      wrapInList:
        (typeOrName, attrs) =>
        ({ state, dispatch }) => {
          const type = typeof typeOrName === "string" ? state.schema.nodes[typeOrName] : typeOrName;
          if (!type) return false;
          return wrapInList(type, attrs)(state, dispatch);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Shift+Enter: Add a hard break (new line within the paragraph)
      "Shift-Enter": () => {
        return this.editor.chain().setHardBreak().run();
      },
    };
  },
});

export default ListItem;
