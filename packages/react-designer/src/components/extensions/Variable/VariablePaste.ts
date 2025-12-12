import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { isValidVariableName } from "../../utils/validateVariableName";

export const VariablePaste = Extension.create({
  name: "variablePaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => {
            // Transform {{variableName}} patterns in pasted HTML to proper variable spans
            // Only convert valid variable names according to JSON property name rules
            const transformed = html.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
              const trimmed = variableName.trim();
              if (isValidVariableName(trimmed)) {
                return `<span data-variable="true" data-id="${trimmed}"></span>`;
              }
              // Return original match if invalid (keep as plain text)
              return match;
            });
            return transformed;
          },

          transformPastedText: (text: string, _plain: boolean, view: EditorView) => {
            // Handle plain text paste with {{variableName}} patterns
            const variableRegex = /\{\{([^}]+)\}\}/g;

            if (!variableRegex.test(text)) {
              return text; // No variables found, return original text
            }

            // Parse the text and create proper nodes
            const { schema } = view.state;
            const nodes = [];
            let lastIndex = 0;
            let match;

            variableRegex.lastIndex = 0; // Reset regex state

            while ((match = variableRegex.exec(text)) !== null) {
              // Add text before the variable if it exists
              if (match.index > lastIndex) {
                const beforeText = text.substring(lastIndex, match.index);
                if (beforeText) {
                  nodes.push(schema.text(beforeText));
                }
              }

              // Add the variable node only if it's valid
              const variableName = match[1].trim();
              if (schema.nodes.variable && isValidVariableName(variableName)) {
                nodes.push(schema.nodes.variable.create({ id: variableName, isInvalid: false }));
              } else {
                // If invalid, keep as plain text
                const invalidText = match[0];
                nodes.push(schema.text(invalidText));
              }

              lastIndex = match.index + match[0].length;
            }

            // Add any remaining text after the last variable
            if (lastIndex < text.length) {
              const remainingText = text.substring(lastIndex);
              if (remainingText) {
                nodes.push(schema.text(remainingText));
              }
            }

            // If we have nodes, create a fragment and return a slice
            if (nodes.length > 0) {
              const fragment = Fragment.from(nodes);
              const slice = new Slice(fragment, 0, 0);

              // Apply the slice to the current selection
              const tr = view.state.tr.replaceSelection(slice);
              view.dispatch(tr);

              // Return the original text since we've already handled the transformation
              return text;
            }

            return text; // Fallback to original text
          },
        },
      }),
    ];
  },
});
