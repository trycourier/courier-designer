import { mergeAttributes } from "@tiptap/core";
import TiptapHorizontalRule from "@tiptap/extension-horizontal-rule";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TextSelection } from "prosemirror-state";
import type { DividerProps } from "./Divider.types";
import { DividerComponentNode } from "./DividerComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    divider: {
      setDivider: (props: Partial<DividerProps>) => ReturnType;
    };
  }
}

export const defaultDividerProps: DividerProps = {
  margin: 6,
  size: "default",
  color: "#000000",
  width: 1,
  radius: 0,
};

export const Divider = TiptapHorizontalRule.extend({
  name: "divider",
  atom: true,

  addAttributes() {
    return {
      margin: {
        default: defaultDividerProps.margin,
        parseHTML: (element) => element.getAttribute("data-margin"),
        renderHTML: (attributes) => ({
          "data-margin": attributes.margin,
        }),
      },
      size: {
        default: defaultDividerProps.size,
        parseHTML: (element) => element.getAttribute("data-size"),
        renderHTML: (attributes) => ({
          "data-size": attributes.size,
        }),
      },
      color: {
        default: defaultDividerProps.color,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attributes) => ({
          "data-color": attributes.color,
        }),
      },
      width: {
        default: defaultDividerProps.width,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes) => ({
          "data-width": attributes.width,
        }),
      },
      radius: {
        default: defaultDividerProps.radius,
        parseHTML: (element) => element.getAttribute("data-radius"),
        renderHTML: (attributes) => ({
          "data-radius": attributes.radius,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="divider"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "divider",
      }),
      ["hr"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DividerComponentNode);
  },

  addCommands() {
    return {
      setDivider:
        (props) =>
          ({ chain, editor }) => {
            return chain()
              .insertContent({
                type: this.name,
                attrs: {
                  ...defaultDividerProps,
                  ...props,
                },
              })
              .command(({ tr }) => {
                const lastNode = tr.doc.lastChild;
                if (lastNode?.type.name === "divider") {
                  const pos = tr.doc.content.size;
                  tr.insert(pos, editor.schema.nodes.paragraph.create());
                  tr.setSelection(TextSelection.create(tr.doc, pos + 1));
                }
                return true;
              })
              .run();
          },
    };
  },
});

export default Divider;
