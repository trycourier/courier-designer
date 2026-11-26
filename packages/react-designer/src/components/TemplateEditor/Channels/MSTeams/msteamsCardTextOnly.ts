import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { liftTarget } from "@tiptap/pm/transform";

export interface MSTeamsCardTextOnlyOptions {
  /** On while the Teams format is "adaptive_card"; MSTeams.tsx flips it with the format. */
  enabled: boolean;
}

export const MSTeamsCardTextOnlyPluginKey = new PluginKey("msteamsCardTextOnly");

const CARD_UNSUPPORTED_NODES = new Set([
  "heading",
  "blockquote",
  "imageBlock",
  "inlineImage",
  "divider",
]);
const REMOVED_NODES = new Set(["imageBlock", "inlineImage", "divider"]);

/**
 * An Adaptive card's text block shows no quotes, headings, images or dividers (the send
 * rejects the last three and a quote), and the menu and paste rules aren't the only way
 * in: `> `, `# ` and `---` input rules, Mod-Shift-b, and a dropped or pasted image file.
 * In card mode quotes and headings become plain paragraphs, and images (inline ones
 * too) and dividers go.
 */
export const MSTeamsCardTextOnly = Extension.create<MSTeamsCardTextOnlyOptions>({
  name: "msteamsCardTextOnly",

  addOptions() {
    return { enabled: false };
  },

  addProseMirrorPlugins() {
    // The same object MSTeams.tsx flips `enabled` on, read at each transaction.
    const options = this.options;
    return [
      new Plugin({
        key: MSTeamsCardTextOnlyPluginKey,
        appendTransaction(transactions, _oldState, state) {
          if (!options.enabled || !transactions.some((tr) => tr.docChanged)) return null;
          const paragraph = state.schema.nodes.paragraph;
          if (!paragraph) return null;

          const found: { node: ProseMirrorNode; pos: number }[] = [];
          state.doc.descendants((node, pos) => {
            if (CARD_UNSUPPORTED_NODES.has(node.type.name)) {
              found.push({ node, pos });
              return false;
            }
            return true;
          });
          if (!found.length) return null;

          const tr = state.tr;
          // Last first, so earlier positions stay valid.
          for (const { node, pos } of found.reverse()) {
            if (REMOVED_NODES.has(node.type.name)) {
              tr.delete(pos, pos + node.nodeSize);
            } else if (node.type.name === "heading") {
              const attrs = Object.fromEntries(
                Object.keys(paragraph.spec.attrs ?? {})
                  .filter((key) => key in node.attrs)
                  .map((key) => [key, node.attrs[key]])
              );
              tr.setNodeMarkup(pos, paragraph, attrs);
            } else {
              // Lift the quote's blocks out rather than replacing the quote, so the caret
              // stays in the text being typed instead of mapping past it.
              const range = tr.doc
                .resolve(pos + 1)
                .blockRange(tr.doc.resolve(pos + node.nodeSize - 1));
              const target = range ? liftTarget(range) : null;
              if (range && target !== null) tr.lift(range, target);
              else tr.replaceWith(pos, pos + node.nodeSize, node.content);
            }
          }
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
