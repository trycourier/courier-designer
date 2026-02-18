import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";
import type { Mark, Node, Schema } from "@tiptap/pm/model";
import { isValidVariableName } from "../../utils/validateVariableName";

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
const VARIABLE_TEST = /\{\{[^}]+\}\}/;

/**
 * Replaces {{variableName}} patterns with proper variable span elements in an HTML string.
 * Only converts valid variable names; invalid ones are left as plain text.
 */
function replaceVariablePatternsInHtml(html: string): string {
  return html.replace(VARIABLE_PATTERN, (match, variableName) => {
    const trimmed = variableName.trim();
    if (isValidVariableName(trimmed)) {
      return `<span data-variable="true" data-id="${trimmed}"></span>`;
    }
    return match;
  });
}

/**
 * Split a text string containing {{var}} patterns into an array of
 * text nodes and variable nodes.
 */
function splitTextWithVariables(text: string, schema: Schema, marks: readonly Mark[]): Node[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const nodes: Node[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(schema.text(text.substring(lastIndex, match.index), marks));
    }

    const varName = match[1].trim();
    if (schema.nodes.variable && isValidVariableName(varName)) {
      nodes.push(schema.nodes.variable.create({ id: varName, isInvalid: false }));
    } else {
      nodes.push(schema.text(match[0], marks));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(schema.text(text.substring(lastIndex), marks));
  }

  return nodes;
}

/**
 * Recursively walk a Fragment, replacing text nodes that contain {{var}}
 * patterns with a mix of text nodes and variable nodes.
 */
function transformFragment(fragment: Fragment, schema: Schema): Fragment {
  const newNodes: Node[] = [];
  let changed = false;

  fragment.forEach((node) => {
    if (node.isText && VARIABLE_TEST.test(node.text || "")) {
      const parts = splitTextWithVariables(node.text || "", schema, node.marks);
      newNodes.push(...parts);
      changed = true;
    } else if (node.content && node.content.size > 0) {
      const newContent = transformFragment(node.content, schema);
      if (newContent !== node.content) {
        newNodes.push(node.copy(newContent));
        changed = true;
      } else {
        newNodes.push(node);
      }
    } else {
      newNodes.push(node);
    }
  });

  return changed ? Fragment.from(newNodes) : fragment;
}

export const VariablePaste = Extension.create({
  name: "variablePaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => {
            // First, try direct regex on the raw HTML (fast path)
            const directResult = replaceVariablePatternsInHtml(html);
            if (directResult !== html) return directResult;

            // If no direct match, the {{var}} patterns may be split across
            // multiple <span> elements (common when copying from browsers/apps).
            // Check the plain text content for variable patterns.
            const div = document.createElement("div");
            div.innerHTML = html;
            const textContent = div.textContent || "";

            if (!VARIABLE_TEST.test(textContent)) return html;

            // Variables exist in the text but are broken across HTML elements.
            // Strip all <span> tags (preserving their text content) to make
            // the patterns contiguous, then apply the regex.
            const stripped = html.replace(/<\/?span[^>]*>/gi, "");
            return replaceVariablePatternsInHtml(stripped);
          },

          handlePaste: (view, _event, slice) => {
            // Check if the parsed slice still has text nodes with {{var}} patterns.
            // If transformPastedHTML already converted them, text nodes won't have
            // these patterns and we return false to let the default flow continue
            // (including FixedChannelPaste).
            let hasVariableText = false;
            slice.content.descendants((node) => {
              if (node.isText && VARIABLE_TEST.test(node.text || "")) {
                hasVariableText = true;
                return false;
              }
            });

            if (!hasVariableText) {
              return false;
            }

            // Transform the slice content, replacing text {{var}} with variable nodes
            const newContent = transformFragment(slice.content, view.state.schema);
            const newSlice = new Slice(newContent, slice.openStart, slice.openEnd);

            const tr = view.state.tr.replaceSelection(newSlice);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
