import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ButtonProps } from "./Button.types";
import { ButtonComponentNode } from "./ButtonComponent";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";

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
  label: "Button",
  link: "",
  alignment: "center",
  backgroundColor: "#0085FF",
  borderRadius: 4,
  padding: 6,
  fontWeight: "normal",
  fontStyle: "normal",
  isUnderline: false,
  isStrike: false,
  // Legacy properties - kept for backward compat but not used in new templates
  textColor: "#ffffff",
  borderColor: "transparent",
};

export const Button = Node.create({
  name: "button",
  group: "block",
  content: "inline*",
  selectable: false,
  isolating: true,

  onCreate() {
    generateNodeIds(this.editor, this.name);
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
      padding: {
        default: defaultButtonProps.padding,
        parseHTML: (element) => element.getAttribute("data-padding"),
        renderHTML: (attributes) => ({
          "data-padding": attributes.padding,
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
      locales: {
        default: undefined,
        parseHTML: () => undefined,
        renderHTML: () => ({}),
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
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "button",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonComponentNode);
  },

  addKeyboardShortcuts() {
    return {
      "Mod-a": ({ editor }) => {
        const { $from } = editor.state.selection;

        // Check if cursor is inside a button node
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name === "button") {
            // Get the position of the button node
            const start = $from.start(depth);
            const end = $from.end(depth);

            // Select all content within the button
            editor.commands.setTextSelection({ from: start, to: end });
            return true; // Prevent default Cmd+A behavior
          }
        }

        return false; // Let default behavior handle it
      },
    };
  },

  addCommands() {
    return {
      setButton:
        (props) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: props,
              content: [{ type: "text", text: props.label || "Button" }],
            })
            .run();
        },
    };
  },
});
