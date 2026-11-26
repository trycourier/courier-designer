import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface MSTeamsCardTextOnlyOptions {
  /** On while the Teams format is "adaptive_card"; MSTeams.tsx flips it with the format. */
  enabled: boolean;
}

export const MSTeamsCardTextOnlyPluginKey = new PluginKey("msteamsCardTextOnly");

/**
 * An Adaptive card's text block shows no quotes or headings (the send rejects a quote),
 * and the menu isn't the only way in: `> ` and `# ` input rules and Mod-Shift-b make them
 * too. In card mode any that appear become plain paragraphs.
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
            if (node.type.name === "heading" || node.type.name === "blockquote") {
              found.push({ node, pos });
              return false;
            }
            return true;
          });
          if (!found.length) return null;

          const tr = state.tr;
          // Last first, so earlier positions stay valid.
          for (const { node, pos } of found.reverse()) {
            if (node.type.name === "heading") {
              const attrs = Object.fromEntries(
                Object.keys(paragraph.spec.attrs ?? {})
                  .filter((key) => key in node.attrs)
                  .map((key) => [key, node.attrs[key]])
              );
              tr.setNodeMarkup(pos, paragraph, attrs);
            } else {
              tr.replaceWith(pos, pos + node.nodeSize, node.content);
            }
          }
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
