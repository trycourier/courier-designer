import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ButtonProps } from "./Button.types";
import { ButtonComponentNode } from "./ButtonComponent";
import { v4 as uuidv4 } from 'uuid';
// import { TextSelection } from "prosemirror-state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    button: {
      setButton: (props: Partial<ButtonProps>) => ReturnType;
      toggleBold: () => ReturnType;
      toggleItalic: () => ReturnType;
      toggleUnderline: () => ReturnType;
    };
  }
}

export const defaultButtonProps: ButtonProps = {
  label: "Click me",
  link: "",
  alignment: "center",
  size: "default",
  backgroundColor: "#0085FF",
  textColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "#000000",
  margin: 6,
  fontWeight: "normal",
  fontStyle: "normal",
  isUnderline: false,
  isStrike: false,
};

export const Button = Node.create({
  name: "button",
  group: "block",
  atom: true,

  onCreate() {
    const id = `node-${uuidv4()}`
    this.editor.commands.updateAttributes(this.name, {
      id: id
    });
  },

  addAttributes() {
    return {
      label: {
        default: defaultButtonProps.label,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      link: {
        default: defaultButtonProps.link,
        parseHTML: (element) => element.getAttribute("data-link"),
        renderHTML: (attributes) => ({
          "data-link": attributes.link,
        }),
      },
      alignment: {
        default: defaultButtonProps.alignment,
        parseHTML: (element) => element.getAttribute("data-alignment"),
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment,
        }),
      },
      size: {
        default: defaultButtonProps.size,
        parseHTML: (element) => element.getAttribute("data-size"),
        renderHTML: (attributes) => ({
          "data-size": attributes.size,
        }),
      },
      backgroundColor: {
        default: defaultButtonProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      textColor: {
        default: defaultButtonProps.textColor,
        parseHTML: (element) => element.getAttribute("data-text-color"),
        renderHTML: (attributes) => ({
          "data-text-color": attributes.textColor,
        }),
      },
      borderWidth: {
        default: defaultButtonProps.borderWidth,
        parseHTML: (element) => element.getAttribute("data-border-width"),
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: defaultButtonProps.borderRadius,
        parseHTML: (element) => element.getAttribute("data-border-radius"),
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: defaultButtonProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
      margin: {
        default: defaultButtonProps.margin,
        parseHTML: (element) => element.getAttribute("data-margin"),
        renderHTML: (attributes) => ({
          "data-margin": attributes.margin,
        }),
      },
      fontWeight: {
        default: defaultButtonProps.fontWeight,
        parseHTML: (element) => element.getAttribute("data-font-weight"),
        renderHTML: (attributes) => ({
          "data-font-weight": attributes.fontWeight,
        }),
      },
      fontStyle: {
        default: defaultButtonProps.fontStyle,
        parseHTML: (element) => element.getAttribute("data-font-style"),
        renderHTML: (attributes) => ({
          "data-font-style": attributes.fontStyle,
        }),
      },
      isUnderline: {
        default: defaultButtonProps.isUnderline,
        parseHTML: (element) => element.getAttribute("data-is-underline"),
        renderHTML: (attributes) => ({
          "data-is-underline": attributes.isUnderline,
        }),
      },
      isStrike: {
        default: defaultButtonProps.isStrike,
        parseHTML: (element) => element.getAttribute("data-is-strike"),
        renderHTML: (attributes) => ({
          "data-is-strike": attributes.isStrike,
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
      // setButton:
      //   (props) =>
      //     ({ chain, editor }) => {
      //       return chain()
      //         .insertContent({
      //           type: this.name,
      //           attrs: props,
      //         })
      //         .command(({ tr }) => {
      //           const lastNode = tr.doc.lastChild;
      //           if (lastNode?.type.name === "button") {
      //             const pos = tr.doc.content.size;
      //             tr.insert(pos, editor.schema.nodes.paragraph.create());
      //             tr.setSelection(TextSelection.create(tr.doc, pos + 1));
      //           }
      //           return true;
      //         })
      //         .run();
      //     },
      toggleBold: () => ({ editor, chain }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        // Only handle bold for button nodes
        if (node?.type.name === 'button') {
          const newFontWeight = node.attrs.fontWeight === 'bold' ? 'normal' : 'bold';
          return chain()
            .updateAttributes(node.type, { fontWeight: newFontWeight })
            .run();
        }

        // For non-button nodes, use the core bold mark
        return chain()
          .focus()
          .toggleMark('bold')
          .run();
      },
      toggleItalic: () => ({ editor, chain }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        if (node?.type.name === 'button') {
          const newFontStyle = node.attrs.fontStyle === 'italic' ? 'normal' : 'italic';
          return chain()
            .updateAttributes(node.type, { fontStyle: newFontStyle })
            .run();
        }

        return chain()
          .focus()
          .toggleMark('italic')
          .run();
      },
      toggleUnderline: () => ({ editor, chain }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        if (node?.type.name === 'button') {
          const newIsUnderline = !node.attrs.isUnderline;
          return chain()
            .updateAttributes(node.type, { isUnderline: newIsUnderline })
            .run();
        }

        return chain()
          .focus()
          .toggleMark('underline')
          .run();
      },
      toggleStrike: () => ({ editor, chain }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        if (node?.type.name === 'button') {
          const newIsStrike = !node.attrs.isStrike;
          return chain()
            .updateAttributes(node.type, { isStrike: newIsStrike })
            .run();
        }

        return chain()
          .focus()
          .toggleMark('strike')
          .run();
      },
    };
  },
});
