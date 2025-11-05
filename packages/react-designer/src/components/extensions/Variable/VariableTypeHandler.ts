import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Extension that converts typed {{variableName}} patterns into variable nodes in real-time
 */
export const VariableTypeHandler = Extension.create({
  name: "variableTypeHandler",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("variableTypeHandler"),
        appendTransaction: (transactions, _oldState, newState) => {
          // Only run on document changes from typing
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          const { schema, doc } = newState;

          // Look for complete {{variableName}} patterns in the entire document
          const variableRegex = /\{\{([^}]+)\}\}/g;
          const replacements: Array<{ from: number; to: number; variableName: string }> = [];

          // NOTE: Performance consideration - this scans the entire document on every change.
          // This may cause performance issues with large documents (500+ nodes).
          // Future optimization: Consider using InputRules or scanning only changed ranges.
          doc.descendants((node, pos) => {
            if (node.isText && node.text) {
              let match;
              // Reset regex state
              variableRegex.lastIndex = 0;

              while ((match = variableRegex.exec(node.text)) !== null) {
                const variableName = match[1].trim();
                if (variableName) {
                  replacements.push({
                    from: pos + match.index,
                    to: pos + match.index + match[0].length,
                    variableName,
                  });
                }
              }
            }
          });

          // If no replacements found, return null
          if (replacements.length === 0) return null;

          // Create a transaction to replace the text with variable nodes
          const tr = newState.tr;

          // Apply replacements in reverse order to maintain positions
          for (let i = replacements.length - 1; i >= 0; i--) {
            const { from, to, variableName } = replacements[i];

            // Check if this position is still valid text
            const node = tr.doc.nodeAt(from);
            if (node && node.isText && schema.nodes.variable) {
              // Replace the text with a variable node
              tr.replaceWith(from, to, schema.nodes.variable.create({ id: variableName }));
            }
          }

          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
