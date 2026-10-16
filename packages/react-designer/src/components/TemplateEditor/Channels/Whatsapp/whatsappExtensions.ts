import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * The header is the canvas's first line, a level-2 heading. DropRules keep drops and moves
 * below it; this is the backstop for any other edit (a paste, a deletion) that would leave a
 * body block first: it puts the header back first, or restores an empty one.
 */
export const WhatsappHeaderFirst = Extension.create({
  name: "whatsappHeaderFirst",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("whatsappHeaderFirst"),
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const { doc, schema } = state;
          if (doc.firstChild?.type.name === "heading") {
            return null;
          }

          let headerPos = -1;
          doc.forEach((node, offset) => {
            if (headerPos < 0 && node.type.name === "heading") {
              headerPos = offset;
            }
          });

          const tr = state.tr;
          if (headerPos > 0) {
            const header = doc.nodeAt(headerPos)!;
            tr.delete(headerPos, headerPos + header.nodeSize).insert(0, header);
          } else {
            tr.insert(0, schema.nodes.heading.create({ level: 2 }));
          }
          return tr;
        },
      }),
    ];
  },
});

/** WhatsApp lists have one level and the translator refuses a nested one, so Tab does not nest. */
export const WhatsappFlatLists = Extension.create({
  name: "whatsappFlatLists",
  // Ahead of List, whose Tab nests
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => editor.isActive("listItem"),
    };
  },
});
