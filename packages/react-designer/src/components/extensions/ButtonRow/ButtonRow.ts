import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import type { ButtonRowProps } from "./ButtonRow.types";
import { ButtonRowComponentNode } from "./ButtonRowComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    buttonRow: {
      setButtonRow: (props: Partial<ButtonRowProps>) => ReturnType;
    };
  }
}

export const defaultButtonRowProps: ButtonRowProps = {
  button1Label: "Register",
  button1Link: "",
  button1BackgroundColor: "#000000", // Filled style (primary button)
  button1TextColor: "#ffffff",
  button2Label: "Learn more",
  button2Link: "",
  button2BackgroundColor: "#ffffff", // Outlined style (secondary button)
  button2TextColor: "#000000",
  padding: 6,
};

export const ButtonRow = Node.create({
  name: "buttonRow",
  group: "block",
  atom: true,

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      id: {
        default: () => `node-${uuidv4()}`,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => ({ id: attributes.id }),
      },
      button1Label: {
        default: defaultButtonRowProps.button1Label,
        parseHTML: (element) => element.getAttribute("data-button1-label"),
        renderHTML: (attributes) => ({ "data-button1-label": attributes.button1Label }),
      },
      button1Link: {
        default: defaultButtonRowProps.button1Link,
        parseHTML: (element) => element.getAttribute("data-button1-link"),
        renderHTML: (attributes) => ({ "data-button1-link": attributes.button1Link }),
      },
      button1BackgroundColor: {
        default: defaultButtonRowProps.button1BackgroundColor,
        parseHTML: (element) => element.getAttribute("data-button1-bg"),
        renderHTML: (attributes) => ({ "data-button1-bg": attributes.button1BackgroundColor }),
      },
      button1TextColor: {
        default: defaultButtonRowProps.button1TextColor,
        parseHTML: (element) => element.getAttribute("data-button1-color"),
        renderHTML: (attributes) => ({ "data-button1-color": attributes.button1TextColor }),
      },
      button2Label: {
        default: defaultButtonRowProps.button2Label,
        parseHTML: (element) => element.getAttribute("data-button2-label"),
        renderHTML: (attributes) => ({ "data-button2-label": attributes.button2Label }),
      },
      button2Link: {
        default: defaultButtonRowProps.button2Link,
        parseHTML: (element) => element.getAttribute("data-button2-link"),
        renderHTML: (attributes) => ({ "data-button2-link": attributes.button2Link }),
      },
      button2BackgroundColor: {
        default: defaultButtonRowProps.button2BackgroundColor,
        parseHTML: (element) => element.getAttribute("data-button2-bg"),
        renderHTML: (attributes) => ({ "data-button2-bg": attributes.button2BackgroundColor }),
      },
      button2TextColor: {
        default: defaultButtonRowProps.button2TextColor,
        parseHTML: (element) => element.getAttribute("data-button2-color"),
        renderHTML: (attributes) => ({ "data-button2-color": attributes.button2TextColor }),
      },
      padding: {
        default: defaultButtonRowProps.padding,
        parseHTML: (element) => parseInt(element.getAttribute("data-padding") || "6"),
        renderHTML: (attributes) => ({ "data-padding": attributes.padding }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="buttonRow"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "buttonRow" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonRowComponentNode);
  },

  addCommands() {
    return {
      setButtonRow:
        (props) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { ...defaultButtonRowProps, ...props },
            })
            .run();
        },
    };
  },
});
