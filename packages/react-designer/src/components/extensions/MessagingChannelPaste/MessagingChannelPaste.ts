import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface MessagingChannelPasteOptions {
  /** Convert all headings to this level, or "strip" to convert headings to paragraphs. */
  headingBehavior: { level: number } | "strip";
  /** Node type names that should be silently dropped on paste (e.g. "button" for Teams). */
  blockedNodeTypes?: string[];
  /** Node type names whose content is kept but not the node (quotes in a Teams card). */
  unwrapNodeTypes?: string[];
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

  // Remove HTML elements for blocked node types before ProseMirror parses them
  const blockedSelectors: Record<string, string> = {
    button: '[data-type="button"]',
  };
  if (opts.blockedNodeTypes?.length) {
    const selector = opts.blockedNodeTypes
      .map((t) => blockedSelectors[t])
      .filter(Boolean)
      .join(", ");
    if (selector) {
      doc.querySelectorAll(selector).forEach((el) => el.remove());
    }
  }

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

function normalizeNode(node: Node, opts: MessagingChannelPasteOptions): Node | null {
  if (opts.blockedNodeTypes?.includes(node.type.name)) {
    return null;
  }

  const children: Node[] = [];
  node.content.forEach((child) => {
    const normalized = normalizeNode(child, opts);
    if (normalized) children.push(normalized);
  });
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
      blockedNodeTypes: [],
      unwrapNodeTypes: [],
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
            const unwrap = new Set(opts.unwrapNodeTypes ?? []);
            const mapped: Node[] = [];
            let { openStart, openEnd } = slice;
            // Its blocks take its place, one level up, as do those of a quote inside it.
            const add = (node: Node, atStart: boolean, atEnd: boolean) => {
              if (!unwrap.has(node.type.name)) {
                mapped.push(node);
                return;
              }
              if (atStart && openStart > 0) openStart -= 1;
              if (atEnd && openEnd > 0) openEnd -= 1;
              const last = node.childCount - 1;
              node.forEach((child, _offset, index) =>
                add(child, atStart && index === 0, atEnd && index === last)
              );
            };
            const last = slice.content.childCount - 1;
            slice.content.forEach((node, _offset, index) => {
              const normalized = normalizeNode(node, opts);
              if (normalized) add(normalized, index === 0, index === last);
            });
            return new Slice(Fragment.from(mapped), openStart, openEnd);
          },
        },
      }),
    ];
  },
});

export default MessagingChannelPaste;
