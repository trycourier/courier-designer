import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ButtonProps } from "./Button.types";
import { ButtonComponentNode } from "./ButtonComponent";
import { TextSelection } from "prosemirror-state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    button: {
      setButton: (props: Partial<ButtonProps>) => ReturnType;
    };
  }
}

const defaultProps: ButtonProps = {
  label: "Button",
  link: "",
  alignment: "center",
  size: "default",
  backgroundColor: "#0085FF",
  textColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "#ffffff",
};

export const Button = Node.create({
  name: "button",
  group: "block",
  draggable: true,
  selectable: true,
  atom: true,
  inline: false,

  addAttributes() {
    return {
      label: {
        default: defaultProps.label,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      link: {
        default: defaultProps.link,
        parseHTML: (element) => element.getAttribute("data-link"),
        renderHTML: (attributes) => ({
          "data-link": attributes.link,
        }),
      },
      alignment: {
        default: defaultProps.alignment,
        parseHTML: (element) => element.getAttribute("data-alignment"),
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment,
        }),
      },
      size: {
        default: defaultProps.size,
        parseHTML: (element) => element.getAttribute("data-size"),
        renderHTML: (attributes) => ({
          "data-size": attributes.size,
        }),
      },
      backgroundColor: {
        default: defaultProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      textColor: {
        default: defaultProps.textColor,
        parseHTML: (element) => element.getAttribute("data-text-color"),
        renderHTML: (attributes) => ({
          "data-text-color": attributes.textColor,
        }),
      },
      borderWidth: {
        default: defaultProps.borderWidth,
        parseHTML: (element) => element.getAttribute("data-border-width"),
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: defaultProps.borderRadius,
        parseHTML: (element) => element.getAttribute("data-border-radius"),
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: defaultProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="button"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "button",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonComponentNode);
  },

  addCommands() {
    return {
      setButton:
        (props) =>
        ({ chain, editor }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: props,
            })
            .command(({ tr }) => {
              const lastNode = tr.doc.lastChild;
              if (lastNode?.type.name === "button") {
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
