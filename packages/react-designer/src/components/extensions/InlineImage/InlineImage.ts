import { Node } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const isWhitespaceBoundary = (node: PMNode | null | undefined, side: "before" | "after") => {
  if (!node) return true;
  if (node.type.name === "hardBreak") return true;
  if (!node.isText) return false;
  const text = node.text ?? "";
  return /\s/.test(side === "before" ? text.slice(-1) : text.slice(0, 1));
};

const spacer = () => {
  const el = document.createElement("span");
  el.textContent = " ";
  el.setAttribute("data-inline-image-gap", "");
  return el;
};

/**
 * The renderer wraps every inline img in whitespace, so the email shows a space
 * on each side the author's text does not already supply. Show the same gap here
 * without putting it in the document.
 */
const gapDecorations = (doc: PMNode) => {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "inlineImage") return;
    const end = pos + node.nodeSize;
    const before = doc.resolve(pos).nodeBefore;
    const after = doc.resolve(end).nodeAfter;
    // Block start collapses the renderer's whitespace away; two adjacent images share one gap.
    if (before?.type.name !== "inlineImage" && !isWhitespaceBoundary(before, "before")) {
      decorations.push(Decoration.widget(pos, spacer, { side: -1, key: "gap-before" }));
    }
    if (!isWhitespaceBoundary(after, "after")) {
      decorations.push(Decoration.widget(end, spacer, { side: 1, key: "gap-after" }));
    }
  });
  return DecorationSet.create(doc, decorations);
};

/**
 * An `img` placed inside a text element's `elements`. It has no editing UI yet;
 * it exists so the image is shown and survives an open/save instead of being dropped.
 */
export const InlineImage = Node.create({
  name: "inlineImage",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: null },
      width: { default: null },
      href: { default: null },
      disableTracking: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[data-inline-image]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            src: el.getAttribute("src") || "",
            alt: el.getAttribute("alt"),
            width: el.style.width || null,
            href: el.getAttribute("data-href"),
            disableTracking: el.getAttribute("data-disable-tracking") === "true",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, width, href, disableTracking } = node.attrs;
    return [
      "img",
      {
        "data-inline-image": "true",
        src,
        ...(alt && { alt }),
        ...(href && { "data-href": href }),
        ...(disableTracking && { "data-disable-tracking": "true" }),
        ...(width && { style: `width:${width}` }),
      },
    ];
  },

  renderText() {
    return "";
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("inlineImageGap"),
        props: { decorations: (state) => gapDecorations(state.doc) },
      }),
    ];
  },
});

export default InlineImage;
