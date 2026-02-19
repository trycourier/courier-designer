import { mergeAttributes } from "@tiptap/core";
import { Blockquote as TiptapBlockquote } from "@tiptap/extension-blockquote";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { generateNodeIds } from "../../utils/generateNodeIds";
import type { BlockquoteProps } from "./Blockquote.types";
import { BlockquoteComponentNode } from "./BlockquoteComponent";

export const BlockquotePastePluginKey = new PluginKey("blockquotePaste");

/** Flatten blockquote nodes recursively so no nested blockquotes remain. */
function flattenBlockquotes(nodes: Node[]): Node[] {
  const result: Node[] = [];
  for (const node of nodes) {
    if (node.type.name === "blockquote") {
      const inner: Node[] = [];
      node.content.forEach((child: Node) => inner.push(child));
      result.push(...flattenBlockquotes(inner));
    } else {
      result.push(node);
    }
  }
  return result;
}

export const defaultBlockquoteProps: BlockquoteProps = {
  paddingHorizontal: 8,
  paddingVertical: 0,
  backgroundColor: "transparent",
  borderLeftWidth: 2,
  borderColor: "#e0e0e0",
};

export const Blockquote = TiptapBlockquote.extend({
  content: "block+",

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: "",
      },
    };
  },

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      id: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      paddingHorizontal: {
        default: defaultBlockquoteProps.paddingHorizontal,
        parseHTML: (element) => element.getAttribute("data-padding-horizontal"),
        renderHTML: (attributes) => ({
          "data-padding-horizontal": attributes.paddingHorizontal,
        }),
      },
      paddingVertical: {
        default: defaultBlockquoteProps.paddingVertical,
        parseHTML: (element) => element.getAttribute("data-padding-vertical"),
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      backgroundColor: {
        default: defaultBlockquoteProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      borderLeftWidth: {
        default: defaultBlockquoteProps.borderLeftWidth,
        parseHTML: (element) => element.getAttribute("data-border-left-width"),
        renderHTML: (attributes) => ({
          "data-border-left-width": attributes.borderLeftWidth,
        }),
      },
      borderColor: {
        default: defaultBlockquoteProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
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
    return [{ tag: "blockquote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        "data-type": "blockquote",
        "data-id": HTMLAttributes.id,
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Block italic shortcut inside blockquote – text is already rendered
      // as italic visually, and the italic mark is not supported in Elemental
      // quote content on the backend.
      "Mod-i": ({ editor }) => editor.isActive("blockquote"),
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { empty } = selection;

        if (!empty) return false;

        const isInBlockquote = editor.isActive("blockquote");
        const isInParagraph = editor.isActive("paragraph");

        if (!isInParagraph || !isInBlockquote) return false;

        return editor
          .chain()
          .command(({ tr }) => {
            tr.split(selection.from);
            const pos = tr.selection.from;
            const $pos = tr.doc.resolve(pos);
            if ($pos.depth > 1) {
              const range = $pos.blockRange();
              if (range) {
                tr.lift(range, 0);
              }
            }
            return true;
          })
          .focus()
          .run();
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: BlockquotePastePluginKey,
        props: {
          handlePaste: (view, _event, slice) => {
            const { state } = view;
            const { $from } = state.selection;

            const isInsideBlockquote = (() => {
              for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type.name === "blockquote") return true;
              }
              return false;
            })();

            if (!isInsideBlockquote) return false;

            const hasBlockquoteInSlice = (() => {
              let found = false;
              slice.content.forEach((node: Node) => {
                if (node.type.name === "blockquote") found = true;
              });
              return found;
            })();

            if (!hasBlockquoteInSlice) return false;

            const firstIsBlockquote = slice.content.firstChild?.type.name === "blockquote";
            const lastIsBlockquote = slice.content.lastChild?.type.name === "blockquote";

            const topLevelNodes: Node[] = [];
            slice.content.forEach((node: Node) => topLevelNodes.push(node));
            const unwrapped = flattenBlockquotes(topLevelNodes);

            const openStart = firstIsBlockquote
              ? Math.max(0, slice.openStart - 1)
              : slice.openStart;
            const openEnd = lastIsBlockquote ? Math.max(0, slice.openEnd - 1) : slice.openEnd;

            const newSlice = new Slice(Fragment.from(unwrapped), openStart, openEnd);

            const tr = state.tr.replaceSelection(newSlice);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteComponentNode);
  },
});

export default Blockquote;
