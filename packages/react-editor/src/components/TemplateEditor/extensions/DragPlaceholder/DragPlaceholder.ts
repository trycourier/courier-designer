import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DragPlaceholderComponent } from "./DragPlaceholderComponent";

export interface DragPlaceholderOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dragPlaceholder: {
      setDragPlaceholder: (options: { id: string; type: string; pos?: number }) => ReturnType;
      removeDragPlaceholder: () => ReturnType;
    };
  }
}

export const DragPlaceholder = Node.create({
  name: "dragPlaceholder",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            "data-id": attributes.id,
          };
        },
      },
      type: {
        default: "text",
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => {
          return {
            "data-type": attributes.type,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="drag-placeholder"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-type": "drag-placeholder", ...HTMLAttributes }, 0];
  },

  addCommands() {
    return {
      setDragPlaceholder:
        (options) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const node = this.type.create(options);
            if (typeof options.pos === "number") {
              tr.insert(options.pos, node);
            } else {
              tr.replaceSelectionWith(node);
            }
          }
          return true;
        },
      removeDragPlaceholder:
        () =>
        ({ tr, state, dispatch }) => {
          let hasDeleted = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name) {
              if (dispatch && node?.nodeSize) {
                tr.delete(pos, pos + node.nodeSize);
                hasDeleted = true;
              }
              return false;
            }
            return true;
          });
          return hasDeleted;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DragPlaceholderComponent, {
      // Enable drag handle and sorting
      as: "div",
      className: "drag-placeholder-wrapper",
    });
  },
});
