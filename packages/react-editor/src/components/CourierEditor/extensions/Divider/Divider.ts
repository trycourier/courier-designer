import { mergeAttributes } from "@tiptap/core";
import TiptapHorizontalRule from "@tiptap/extension-horizontal-rule";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
// import { TextSelection } from "prosemirror-state";
import type { DividerProps } from "./Divider.types";
import { DividerComponentNode } from "./DividerComponent";
import { generateNodeIds } from "../../utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    divider: {
      setDivider: (props: Partial<DividerProps>) => ReturnType;
    };
  }
}

export const defaultDividerProps: DividerProps = {
  padding: 6,
  color: "#000000",
  size: 1,
  radius: 0,
  variant: "divider",
};

export const defaultSpacerProps: DividerProps = {
  padding: 6,
  color: "transparent",
  size: 1,
  radius: 0,
  variant: "spacer",
};

export const Divider = TiptapHorizontalRule.extend({
  name: "divider",
  atom: true,

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      padding: {
        default: defaultDividerProps.padding,
        parseHTML: (element) => element.getAttribute("data-padding"),
        renderHTML: (attributes) => ({
          "data-padding": attributes.margin,
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
        default: defaultDividerProps.size,
        parseHTML: (element) => element.getAttribute("data-size"),
        renderHTML: (attributes) => ({
          "data-size": attributes.size,
        }),
      },
      radius: {
        default: defaultDividerProps.radius,
        parseHTML: (element) => element.getAttribute("data-radius"),
        renderHTML: (attributes) => ({
          "data-radius": attributes.radius,
        }),
      },
      variant: {
        default: defaultDividerProps.variant,
        parseHTML: (element) => element.getAttribute("data-variant"),
        renderHTML: (attributes) => ({
          "data-variant": attributes.variant,
        }),
      },
      id: {
        default: () => `node-${uuidv4()}`,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
          "data-node-id": attributes.id,
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

  // addCommands() {
  //   return {
  //     setDivider:
  //       (props) =>
  //         ({ chain, editor }) => {
  //           return chain()
  //             .insertContent({
  //               type: this.name,
  //               attrs: {
  //                 ...defaultDividerProps,
  //                 ...props,
  //               },
  //             })
  //             .command(({ tr }) => {
  //               const lastNode = tr.doc.lastChild;
  //               if (lastNode?.type.name === "divider") {
  //                 const pos = tr.doc.content.size;
  //                 tr.insert(pos, editor.schema.nodes.paragraph.create());
  //                 tr.setSelection(TextSelection.create(tr.doc, pos + 1));
  //               }
  //               return true;
  //             })
  //             .run();
  //         },
  //   };
  // },
});

export default Divider;
