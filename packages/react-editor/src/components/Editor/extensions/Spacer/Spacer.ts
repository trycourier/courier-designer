import { mergeAttributes } from "@tiptap/core";
import TiptapHorizontalRule from "@tiptap/extension-horizontal-rule";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { SpacerProps } from "./Spacer.types";
import { SpacerComponentNode } from "./SpacerComponent";
import { TextSelection } from "prosemirror-state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spacer: {
      setSpacer: (props: Partial<SpacerProps>) => ReturnType;
    };
  }
}

const defaultProps: SpacerProps = {
  margin: 0,
  size: "default",
  color: "#000000",
  width: 1,
  radius: 0,
};

export const Spacer = TiptapHorizontalRule.extend({
  name: "spacer",
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      margin: {
        default: defaultProps.margin,
        parseHTML: (element) => element.getAttribute("data-margin"),
        renderHTML: (attributes) => ({
          "data-margin": attributes.margin,
        }),
      },
      size: {
        default: defaultProps.size,
        parseHTML: (element) => element.getAttribute("data-size"),
        renderHTML: (attributes) => ({
          "data-size": attributes.size,
        }),
      },
      color: {
        default: defaultProps.color,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attributes) => ({
          "data-color": attributes.color,
        }),
      },
      width: {
        default: defaultProps.width,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes) => ({
          "data-width": attributes.width,
        }),
      },
      radius: {
        default: defaultProps.radius,
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
        tag: 'div[data-type="spacer"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "spacer",
      }),
      ["hr"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpacerComponentNode);
  },

  addCommands() {
    return {
      setSpacer:
        (props) =>
        ({ chain, editor }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                ...defaultProps,
                ...props,
              },
            })
            .command(({ tr }) => {
              const lastNode = tr.doc.lastChild;
              if (lastNode?.type.name === "spacer") {
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

export default Spacer;
