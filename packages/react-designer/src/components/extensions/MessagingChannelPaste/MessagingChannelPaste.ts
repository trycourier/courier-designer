import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface MessagingChannelPasteOptions {
  /** Convert all headings to this level, or "strip" to convert headings to paragraphs. */
  headingBehavior: { level: number } | "strip";
}

const RESET_ATTRS: Record<string, unknown> = {
  textAlign: "left",
  backgroundColor: "transparent",
  borderWidth: 0,
  borderColor: "transparent",
  paddingHorizontal: 0,
};

const MessagingChannelPastePluginKey = new PluginKey("messagingChannelPaste");

/**
 * The Heading extension's parseHTML only matches `<div data-type="heading">`,
 * but renderHTML outputs `<h1>`/`<h2>`/`<h3>`. When pasting between editors,
 * headings arrive as `<hN>` tags that the parser doesn't recognise, so they
 * fall back to plain text.
 *
 * This hook rewrites the raw HTML *before* ProseMirror's DOMParser runs:
 *  - Slack: `<h1|h2|h3>` → `<div data-type="heading">` (parsed as H1)
 *  - Teams: `<h1|h2|h3>` → `<p>` (headings not supported)
 *
 * It also strips inline styles that carry email-only formatting (alignment,
 * background colour, borders) from paragraphs and headings.
 */
function transformHTML(html: string, opts: MessagingChannelPasteOptions): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
    const replacement = doc.createElement(opts.headingBehavior === "strip" ? "p" : "div");

    if (opts.headingBehavior !== "strip") {
      replacement.setAttribute("data-type", "heading");
    }

    while (el.firstChild) {
      replacement.appendChild(el.firstChild);
    }

    el.replaceWith(replacement);
  });

  // Strip email-only inline styles from paragraphs, divs, and blockquotes
  doc.querySelectorAll("p, div, blockquote").forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.textAlign = "";
      el.style.backgroundColor = "";
      el.style.borderWidth = "";
      el.style.borderColor = "";
      el.style.borderStyle = "";
    }
  });

  return doc.body.innerHTML;
}

function normalizeNode(node: Node, opts: MessagingChannelPasteOptions): Node {
  const children: Node[] = [];
  node.content.forEach((child) => children.push(normalizeNode(child, opts)));
  const newContent = Fragment.from(children);

  if (node.type.name === "heading") {
    if (opts.headingBehavior === "strip") {
      const paragraphType = node.type.schema.nodes.paragraph;
      if (paragraphType) {
        const pAttrs = { ...node.attrs, ...RESET_ATTRS };
        return paragraphType.create(pAttrs, newContent, node.marks);
      }
    } else {
      const resetAttrs = { ...node.attrs, ...RESET_ATTRS, level: opts.headingBehavior.level };
      return node.type.create(resetAttrs, newContent, node.marks);
    }
  }

  if (node.type.name === "paragraph") {
    const resetAttrs = { ...node.attrs, ...RESET_ATTRS };
    return node.type.create(resetAttrs, newContent, node.marks);
  }

  if (node.type.name === "blockquote") {
    return node.type.create(node.attrs, newContent, node.marks);
  }

  if (node.childCount > 0) {
    return node.copy(newContent);
  }

  return node;
}

export const MessagingChannelPaste = Extension.create<MessagingChannelPasteOptions>({
  name: "messagingChannelPaste",

  addOptions() {
    return {
      headingBehavior: { level: 1 },
    };
  },

  addProseMirrorPlugins() {
    const opts = this.options;
    return [
      new Plugin({
        key: MessagingChannelPastePluginKey,
        props: {
          transformPastedHTML(html) {
            return transformHTML(html, opts);
          },
          transformPasted(slice) {
            const mapped: Node[] = [];
            slice.content.forEach((node) => mapped.push(normalizeNode(node, opts)));
            return new Slice(Fragment.from(mapped), slice.openStart, slice.openEnd);
          },
        },
      }),
    ];
  },
});

export default MessagingChannelPaste;
