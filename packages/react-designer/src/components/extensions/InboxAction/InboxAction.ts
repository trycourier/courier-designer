import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { syncButtonContentToLabelAttr } from "../Button/buttonUtils";
import { InboxActionComponentNode } from "./InboxActionComponent";
import { defaultInboxActionProps, type InboxActionProps } from "./InboxAction.types";
import { conditionalAttribute } from "../shared/conditionalAttribute";

/**
 * A link can hold `{{variables}}`, and the braces do not survive a round trip through an HTML
 * attribute. Same sentinels the email button uses, so a link pasted between the two survives.
 */
const VAR_OPEN = "__COURIER_VAR_OPEN__";
const VAR_CLOSE = "__COURIER_VAR_CLOSE__";
const encodeVars = (v: string | undefined | null): string | undefined | null =>
  v?.replace(/\{\{/g, VAR_OPEN).replace(/\}\}/g, VAR_CLOSE);
const decodeVars = (v: string | undefined | null): string | undefined | null =>
  v?.replace(new RegExp(VAR_OPEN, "g"), "{{").replace(new RegExp(VAR_CLOSE, "g"), "}}");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inboxAction: {
      setInboxAction: (props: Partial<InboxActionProps>) => ReturnType;
    };
  }
}

export { defaultInboxActionProps };

/**
 * The Inbox channel's action node.
 *
 * Shares nothing with the email `button`. Its attributes are the whole of what an Inbox action
 * stores — a label, a link, a style — so there is no default here that could be written into a
 * template as though an author had chosen it. See `InboxAction.types` for why that matters.
 */
export const InboxAction = Node.create({
  name: "inboxAction",
  group: "block",
  // `handlebarsExpression` belongs here for the same reason it belongs in the
  // email button: the sidebar writes a label as nodes, and a node the schema
  // refuses does not fail — ProseMirror fits it in wherever it IS legal, which
  // put every `{{#if …}}` typed in the sidebar into a NEW paragraph after the
  // action and left the action itself unchanged.
  content: "(text | variable | handlebarsExpression)*",
  draggable: true,
  // Same as the email button, and for the same reason: a selectable node takes
  // a NODE selection on click, so clicking the label put the caret nowhere
  // inside it and the next keystroke went wherever the document selection
  // happened to be. `isolating` keeps an edit at either end from merging the
  // action into the block beside it.
  selectable: false,
  isolating: true,

  addAttributes() {
    return {
      ...conditionalAttribute,
      label: {
        default: defaultInboxActionProps.label,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({ "data-label": attributes.label }),
      },
      link: {
        default: defaultInboxActionProps.link,
        parseHTML: (element) => decodeVars(element.getAttribute("data-link")),
        renderHTML: (attributes) => ({ "data-link": encodeVars(attributes.link) }),
      },
      actionStyle: {
        default: defaultInboxActionProps.actionStyle,
        parseHTML: (element) => element.getAttribute("data-action-style"),
        renderHTML: (attributes) => ({ "data-action-style": attributes.actionStyle }),
      },
      align: {
        default: defaultInboxActionProps.align,
        parseHTML: (element) => element.getAttribute("data-align"),
        renderHTML: (attributes) => ({ "data-align": attributes.align }),
      },
      disableTracking: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-disable-tracking") === "true",
        renderHTML: (attributes) =>
          attributes.disableTracking ? { "data-disable-tracking": "true" } : {},
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => (attributes.id ? { "data-id": attributes.id } : {}),
      },
      locales: { default: null, renderHTML: () => ({}) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="inbox-action"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "inbox-action" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InboxActionComponentNode);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("syncInboxActionContentToLabel"),
        // The sidebar reads the `label` ATTRIBUTE, and typing on the canvas only
        // changes the inline content — so without this the sidebar went on
        // showing the label as it was before the author touched the button. The
        // email button has carried the same plugin from the start.
        appendTransaction: (transactions, _oldState, newState) =>
          transactions.some((tr) => tr.docChanged)
            ? syncButtonContentToLabelAttr(newState, "inboxAction")
            : null,
      }),
    ];
  },
});
