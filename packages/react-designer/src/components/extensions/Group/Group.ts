import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import { conditionalAttribute } from "../shared/conditionalAttribute";
import { defaultGroupProps } from "./Group.types";
import { GroupComponentNode } from "./GroupComponent";

export { defaultGroupProps };

/**
 * Elemental `group`: a transparent wrapper the send flattens into its parent,
 * repeated once per item when it has a `loop`.
 */
export const Group = Node.create({
  name: "group",
  group: "block",
  content: "block*",
  isolating: true,
  selectable: false,

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      ...conditionalAttribute,
      id: {
        default: () => `node-${uuidv4()}`,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
          "data-node-id": attributes.id,
        }),
      },
      loop: {
        default: defaultGroupProps.loop,
        parseHTML: (element) => element.getAttribute("data-loop") || "",
        renderHTML: (attributes) => (attributes.loop ? { "data-loop": attributes.loop } : {}),
      },
      locales: {
        default: undefined,
        parseHTML: () => undefined,
        renderHTML: () => ({}),
      },
      // Group fields the editor has no control for (padding, border, channels, …).
      // The send ignores most of them, but a save must not drop them.
      elementalProps: {
        default: undefined,
        parseHTML: () => undefined,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="group"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "group",
        class: "c--block c--block-group",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GroupComponentNode);
  },
});

export default Group;
