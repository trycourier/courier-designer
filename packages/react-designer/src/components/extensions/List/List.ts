import { mergeAttributes, Node, type Editor } from "@tiptap/core";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import type { ListProps } from "./List.types";
import { ListComponentNode } from "./ListComponent";

/**
 * Helper to split text block content by hard breaks into separate content arrays.
 * Each segment becomes a list item. Preserves heading type/level if source is a heading.
 */
function splitByHardBreaks(textBlock: PMNode, editor: Editor) {
  const segments: PMNode[][] = [];
  let currentSegment: PMNode[] = [];

  textBlock.content.forEach((node) => {
    if (node.type.name === "hardBreak") {
      // End current segment and start new one
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [];
    } else {
      currentSegment.push(node);
    }
  });

  // Don't forget the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // If no segments (empty text block), return one empty segment
  if (segments.length === 0) {
    segments.push([]);
  }

  // Determine the inner node type (paragraph or heading)
  const isHeading = textBlock.type.name === "heading";
  const headingLevel = isHeading ? textBlock.attrs.level : undefined;

  // Convert segments to list items
  const listItems = segments.map((segment) => {
    let innerNode: PMNode;

    if (isHeading) {
      // Create heading node to preserve styling
      innerNode = editor.state.schema.nodes.heading.create(
        { id: `node-${uuidv4()}`, level: headingLevel },
        segment.length > 0 ? Fragment.from(segment) : undefined
      );
    } else {
      // Create paragraph node
      innerNode = editor.state.schema.nodes.paragraph.create(
        { id: `node-${uuidv4()}` },
        segment.length > 0 ? Fragment.from(segment) : undefined
      );
    }

    return editor.state.schema.nodes.listItem.create(
      { id: `node-${uuidv4()}` },
      Fragment.from(innerNode)
    );
  });

  return listItems;
}

/**
 * Helper to join list items into a single text block with hard breaks between them.
 * Converts multi-item list to a single multi-line paragraph or heading.
 * Preserves heading type/level if list items contain headings.
 */
function joinListItemsWithHardBreaks(listNode: PMNode, editor: Editor) {
  const allContent: PMNode[] = [];
  let isHeading = false;
  let headingLevel = 1;

  listNode.forEach((listItem, _offset, index) => {
    // Add hard break between items (not before the first one)
    if (index > 0) {
      allContent.push(editor.state.schema.nodes.hardBreak.create());
    }

    // Add content from the list item's first child (paragraph or heading)
    listItem.forEach((child) => {
      if (child.type.name === "heading") {
        isHeading = true;
        headingLevel = child.attrs.level || 1;
        child.content.forEach((node) => {
          allContent.push(node);
        });
      } else if (child.type.name === "paragraph") {
        child.content.forEach((node) => {
          allContent.push(node);
        });
      }
    });
  });

  // Create the appropriate text block type
  if (isHeading) {
    return editor.state.schema.nodes.heading.create(
      { id: `node-${uuidv4()}`, level: headingLevel, textAlign: "left" },
      allContent.length > 0 ? Fragment.from(allContent) : undefined
    );
  }

  // Default to paragraph
  return editor.state.schema.nodes.paragraph.create(
    { id: `node-${uuidv4()}`, textAlign: "left" },
    allContent.length > 0 ? Fragment.from(allContent) : undefined
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    list: {
      setList: (props?: Partial<ListProps>) => ReturnType;
      toggleList: () => ReturnType;
      toggleOrderedList: () => ReturnType;
      toggleUnorderedList: () => ReturnType;
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
        ({ commands, editor, tr, dispatch }) => {
          if (editor.isActive("list")) {
            // If we're in a list, remove the entire list and join into single paragraph
            const { $from } = editor.state.selection;

            // Find the list node
            let listDepth = -1;
            for (let d = $from.depth; d >= 0; d--) {
              if ($from.node(d).type.name === "list") {
                listDepth = d;
                break;
              }
            }

            if (listDepth === -1) return false;

            const listNode = $from.node(listDepth);
            const listStart = $from.before(listDepth);
            const listEnd = $from.after(listDepth);

            // Join all list items into a single paragraph with hard breaks
            const paragraph = joinListItemsWithHardBreaks(listNode, editor);

            // Replace list with single paragraph
            if (dispatch) {
              tr.replaceWith(listStart, listEnd, paragraph);
              dispatch(tr);
            }
            return true;
          }
          // Otherwise, wrap in a list
          return commands.wrapInList("list");
        },
      toggleOrderedList:
        () =>
        ({ commands, editor, tr, dispatch }) => {
          if (editor.isActive("list", { listType: "ordered" })) {
            // Remove the entire list and join into single paragraph with hard breaks
            const { $from } = editor.state.selection;

            // Find the list node
            let listDepth = -1;
            for (let d = $from.depth; d >= 0; d--) {
              if ($from.node(d).type.name === "list") {
                listDepth = d;
                break;
              }
            }

            if (listDepth === -1) return false;

            const listNode = $from.node(listDepth);
            const listStart = $from.before(listDepth);
            const listEnd = $from.after(listDepth);

            // Join all list items into a single paragraph with hard breaks
            const paragraph = joinListItemsWithHardBreaks(listNode, editor);

            // Replace list with single paragraph and set selection inside it
            if (dispatch) {
              tr.replaceWith(listStart, listEnd, paragraph);
              // Set selection at the start of the new paragraph content
              const newPos = listStart + 1; // Position inside the paragraph
              tr.setSelection(Selection.near(tr.doc.resolve(newPos)));
              dispatch(tr);
            }
            return true;
          }
          if (editor.isActive("list", { listType: "unordered" })) {
            // Toggle from unordered to ordered
            return commands.updateAttributes("list", { listType: "ordered" });
          }

          // Custom wrap: split paragraph or heading by hard breaks into list items
          const { $from } = editor.state.selection;

          // Find the paragraph or heading node
          let textBlockDepth = -1;
          for (let d = $from.depth; d >= 0; d--) {
            const nodeName = $from.node(d).type.name;
            if (nodeName === "paragraph" || nodeName === "heading") {
              textBlockDepth = d;
              break;
            }
          }

          if (textBlockDepth === -1) {
            return commands.wrapInList("list", { listType: "ordered" });
          }

          const textBlockNode = $from.node(textBlockDepth);
          const textBlockStart = $from.before(textBlockDepth);
          const textBlockEnd = $from.after(textBlockDepth);

          // Split text block by hard breaks
          const listItems = splitByHardBreaks(textBlockNode, editor);

          // Create the list node
          const listNode = editor.state.schema.nodes.list.create(
            { listType: "ordered", id: `node-${uuidv4()}` },
            Fragment.from(listItems)
          );

          // Replace text block with list and set selection inside first list item
          if (dispatch) {
            tr.replaceWith(textBlockStart, textBlockEnd, listNode);
            // Set selection at the start of the first list item's content
            // Structure: list > listItem > paragraph, so +3 to get inside paragraph
            const newPos = textBlockStart + 3;
            tr.setSelection(Selection.near(tr.doc.resolve(newPos)));
            dispatch(tr);
          }
          return true;
        },
      toggleUnorderedList:
        () =>
        ({ commands, editor, tr, dispatch }) => {
          if (editor.isActive("list", { listType: "unordered" })) {
            // Remove the entire list and join into single paragraph with hard breaks
            const { $from } = editor.state.selection;

            // Find the list node
            let listDepth = -1;
            for (let d = $from.depth; d >= 0; d--) {
              if ($from.node(d).type.name === "list") {
                listDepth = d;
                break;
              }
            }

            if (listDepth === -1) return false;

            const listNode = $from.node(listDepth);
            const listStart = $from.before(listDepth);
            const listEnd = $from.after(listDepth);

            // Join all list items into a single paragraph with hard breaks
            const paragraph = joinListItemsWithHardBreaks(listNode, editor);

            // Replace list with single paragraph and set selection inside it
            if (dispatch) {
              tr.replaceWith(listStart, listEnd, paragraph);
              // Set selection at the start of the new paragraph content
              const newPos = listStart + 1; // Position inside the paragraph
              tr.setSelection(Selection.near(tr.doc.resolve(newPos)));
              dispatch(tr);
            }
            return true;
          }
          if (editor.isActive("list", { listType: "ordered" })) {
            // Toggle from ordered to unordered
            return commands.updateAttributes("list", { listType: "unordered" });
          }

          // Custom wrap: split paragraph or heading by hard breaks into list items
          const { $from } = editor.state.selection;

          // Find the paragraph or heading node
          let textBlockDepth = -1;
          for (let d = $from.depth; d >= 0; d--) {
            const nodeName = $from.node(d).type.name;
            if (nodeName === "paragraph" || nodeName === "heading") {
              textBlockDepth = d;
              break;
            }
          }

          if (textBlockDepth === -1) {
            return commands.wrapInList("list", { listType: "unordered" });
          }

          const textBlockNode = $from.node(textBlockDepth);
          const textBlockStart = $from.before(textBlockDepth);
          const textBlockEnd = $from.after(textBlockDepth);

          // Split text block by hard breaks
          const listItems = splitByHardBreaks(textBlockNode, editor);

          // Create the list node
          const listNode = editor.state.schema.nodes.list.create(
            { listType: "unordered", id: `node-${uuidv4()}` },
            Fragment.from(listItems)
          );

          // Replace text block with list and set selection inside first list item
          if (dispatch) {
            tr.replaceWith(textBlockStart, textBlockEnd, listNode);
            // Set selection at the start of the first list item's content
            // Structure: list > listItem > paragraph, so +3 to get inside paragraph
            const newPos = textBlockStart + 3;
            tr.setSelection(Selection.near(tr.doc.resolve(newPos)));
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

export default List;
