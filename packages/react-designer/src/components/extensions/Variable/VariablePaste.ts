import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";
import type { Mark, Node, Schema } from "@tiptap/pm/model";
import { classifyExpression } from "@/lib/utils/handlebars/classifyExpression";
import { segmentText } from "@/lib/utils/handlebars/segmentText";

const VARIABLE_TEST = /\{\{[^}]+\}\}/;

/**
 * Turns pasted handlebars into the spans the schema parses back into nodes.
 *
 * Works on the DOM, not on the HTML string. Clipboard HTML copied from this
 * editor already contains chip spans carrying the source in `data-raw`, and a
 * string-level replacement rewrote the markup INSIDE those attributes — pasting
 * your own chips back produced a chip reading `<span data-handlebars=` followed
 * by the attribute text, and re-escaped `">"` into `"&gt;"` so a valid operator
 * came back invalid.
 *
 * Segmentation comes from `segmentText`, the same function the loader uses, so
 * a pasted conditional lands exactly as a saved one does.
 */
export function replaceVariablePatternsInHtml(html: string): string {
  if (!html.includes("{{")) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const targets: globalThis.Text[] = [];

  while (walker.nextNode()) {
    const textNode = walker.currentNode as globalThis.Text;
    if (!textNode.data.includes("{{")) continue;
    // Already a chip: `parseHTML` handles it, and its `data-raw` is source, not
    // content to re-segment.
    if (
      (textNode.parentElement as HTMLElement | null)?.closest("[data-handlebars],[data-variable]")
    )
      continue;
    targets.push(textNode);
  }

  for (const textNode of targets) {
    const text = textNode.data;
    const replacement = doc.createDocumentFragment();

    for (const segment of segmentText(text)) {
      const source = text.slice(segment.start, segment.end);

      if (segment.type === "text") {
        replacement.appendChild(doc.createTextNode(source));
        continue;
      }

      if (segment.type === "variable") {
        // Malformed here means malformed on load too; leave the author's text.
        if (segment.isInvalid) {
          replacement.appendChild(doc.createTextNode(source));
          continue;
        }
        const span = doc.createElement("span");
        span.setAttribute("data-variable", "true");
        span.setAttribute("data-id", segment.name);
        replacement.appendChild(span);
        continue;
      }

      const expr = classifyExpression(source.replace(/^\{\{\{?/, "").replace(/\}?\}\}$/, ""));
      const span = doc.createElement("span");
      // setAttribute, so escaping is the DOM's job rather than ours.
      span.setAttribute("data-handlebars", "true");
      span.setAttribute("data-raw", source);
      span.setAttribute("data-kind", expr.kind);
      span.setAttribute("data-name", expr.name);
      replacement.appendChild(span);
    }

    textNode.parentNode?.replaceChild(replacement, textNode);
  }

  return doc.body.innerHTML;
}

/**
 * Split a text string containing {{var}} patterns into an array of
 * text nodes and variable nodes.
 */
function splitTextWithVariables(text: string, schema: Schema, marks: readonly Mark[]): Node[] {
  const nodes: Node[] = [];

  // Same segmentation as the loader and as the HTML path above, so a pasted
  // expression becomes an expression chip here too rather than literal text.
  for (const segment of segmentText(text)) {
    const source = text.slice(segment.start, segment.end);

    if (segment.type === "text") {
      if (source) nodes.push(schema.text(source, marks));
      continue;
    }

    if (segment.type === "variable") {
      if (schema.nodes.variable && !segment.isInvalid) {
        nodes.push(schema.nodes.variable.create({ id: segment.name, isInvalid: false }));
      } else {
        nodes.push(schema.text(source, marks));
      }
      continue;
    }

    if (schema.nodes.handlebarsExpression) {
      const expr = classifyExpression(source.replace(/^\{\{\{?/, "").replace(/\}?\}\}$/, ""));
      nodes.push(
        schema.nodes.handlebarsExpression.create({
          raw: source,
          kind: expr.kind,
          name: expr.name,
          isInvalid: segment.isInvalid,
        })
      );
    } else {
      nodes.push(schema.text(source, marks));
    }
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
