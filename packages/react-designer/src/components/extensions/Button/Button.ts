import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { ButtonProps } from "./Button.types";
import { ButtonComponentNode } from "./ButtonComponent";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import { syncButtonContentToLabelAttr } from "./buttonUtils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    button: {
      setButton: (props: Partial<ButtonProps>) => ReturnType;
    };
  }
}

export const defaultButtonProps: ButtonProps = {
  label: "Enter text",
  link: "",
  alignment: "center",
  backgroundColor: "#0085FF",
  borderRadius: 0,
  paddingVertical: 8,
  paddingHorizontal: 16,
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
  content: "text*",
  marks: "",
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
      paddingVertical: {
        default: defaultButtonProps.paddingVertical,
        parseHTML: (element) => {
          const v = element.getAttribute("data-padding-vertical");
          if (v != null) return Number(v);
          // Backward compat: migrate old single `data-padding` value
          const legacy = element.getAttribute("data-padding");
          if (legacy != null) return Number(legacy) + 2;
          return defaultButtonProps.paddingVertical;
        },
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      paddingHorizontal: {
        default: defaultButtonProps.paddingHorizontal,
        parseHTML: (element) => {
          const v = element.getAttribute("data-padding-horizontal");
          if (v != null) return Number(v);
          const legacy = element.getAttribute("data-padding");
          if (legacy != null) return Number(legacy) + 10;
          return defaultButtonProps.paddingHorizontal;
        },
        renderHTML: (attributes) => ({
          "data-padding-horizontal": attributes.paddingHorizontal,
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
    const isInsideButton = (editor: typeof this.editor) => {
      const { $from } = editor.state.selection;
      for (let depth = $from.depth; depth >= 0; depth--) {
        if ($from.node(depth).type.name === "button") return true;
      }
      return false;
    };

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
      // Block formatting shortcuts inside button nodes
      "Mod-b": ({ editor }) => isInsideButton(editor),
      "Mod-i": ({ editor }) => isInsideButton(editor),
      "Mod-u": ({ editor }) => isInsideButton(editor),
      "Mod-Shift-s": ({ editor }) => isInsideButton(editor),
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
              content: [{ type: "text", text: props.label || defaultButtonProps.label }],
            })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("syncButtonContentToLabel"),
        appendTransaction: (transactions, _oldState, newState) => {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          return syncButtonContentToLabelAttr(newState);
        },
      }),
    ];
  },
});
