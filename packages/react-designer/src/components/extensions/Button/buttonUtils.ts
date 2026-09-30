import { segmentText } from "@/lib/utils/handlebars/segmentText";
import type { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

export function findButtonNodeById(
  doc: ProseMirrorNode,
  id: string
): { pos: number; node: ProseMirrorNode } | null {
  let result: { pos: number; node: ProseMirrorNode } | null = null;

  doc.descendants((node, pos) => {
    if (node.type.name === "button" && node.attrs.id === id) {
      result = { pos, node };
      return false;
    }
    return true;
  });

  return result;
}

export function findButtonNodeAtPosition(
  doc: ProseMirrorNode,
  position: number
): { pos: number; node: ProseMirrorNode } | null {
  const node = doc.nodeAt(position);
  if (node?.type.name === "button") {
    return { pos: position, node };
  }
  return null;
}

export function extractButtonTextContent(node: ProseMirrorNode): string {
  let textContent = "";
  node.content.forEach((child) => {
    if (child.isText) {
      textContent += child.text;
    } else if (child.type.name === "variable") {
      textContent += child.attrs?.id ? `{{${child.attrs.id}}}` : "";
    } else if (child.type.name === "handlebarsExpression") {
      // Verbatim, like everywhere else an expression is serialized.
      textContent += typeof child.attrs?.raw === "string" ? child.attrs.raw : "";
    }
  });
  return textContent;
}

/**
 * Push a labelled node's inline content back into its `label` attribute.
 *
 * `nodeName` because the Inbox action is the same shape and needs the same
 * plugin: without it, typing on the canvas changed the content and left the
 * attribute stale, so the sidebar — which reads the attribute — kept showing
 * the label as it was before the author typed.
 */
export function syncButtonContentToLabelAttr(
  state: EditorState,
  nodeName = "button"
): Transaction | null {
  const tr = state.tr;
  let modified = false;

  state.doc.descendants((node, pos) => {
    if (node.type.name === nodeName) {
      const textContent = extractButtonTextContent(node);

      if (textContent !== node.attrs.label) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          label: textContent,
        });
        modified = true;
      }
    }
  });

  return modified ? tr : null;
}

function parseLabelToNodes(schema: Schema, label: string): ProseMirrorNode[] {
  const nodes: ProseMirrorNode[] = [];

  // Same segmentation as everywhere else, so a helper in a label becomes an
  // expression node rather than a variable named `capitalize data.name`.
  for (const segment of segmentText(label)) {
    const source = label.slice(segment.start, segment.end);

    if (segment.type === "text") {
      if (source) nodes.push(schema.text(source));
      continue;
    }

    if (segment.type === "variable") {
      if (schema.nodes.variable && !segment.isInvalid) {
        nodes.push(schema.nodes.variable.create({ id: segment.name, isInvalid: false }));
      } else {
        nodes.push(schema.text(source));
      }
      continue;
    }

    if (schema.nodes.handlebarsExpression) {
      nodes.push(
        schema.nodes.handlebarsExpression.create({
          raw: source,
          kind: segment.kind,
          name: segment.name,
          isInvalid: segment.isInvalid,
        })
      );
    } else {
      nodes.push(schema.text(source));
    }
  }
  const lastIndex = label.length;

  if (lastIndex < label.length) {
    nodes.push(schema.text(label.substring(lastIndex)));
  }

  return nodes;
}

/** Nodes that carry a label attribute over their own inline content. */
const LABELLED_BUTTON_NODES = new Set(["button", "inboxAction"]);

export function updateButtonLabelAndContent(
  tr: Transaction,
  buttonPos: number,
  newLabel: string
): boolean {
  const node = tr.doc.nodeAt(buttonPos);
  // The Inbox action is the same shape — a `label` attribute over inline
  // content — and the Inbox sidebar writes its labels through here. Refusing
  // anything but the email button meant typing a label in that sidebar changed
  // nothing on the canvas.
  if (!node || !LABELLED_BUTTON_NODES.has(node.type.name)) {
    return false;
  }

  tr.setNodeMarkup(buttonPos, node.type, {
    ...node.attrs,
    label: newLabel,
  });

  const from = buttonPos + 1;
  const to = buttonPos + 1 + node.content.size;

  if (newLabel) {
    const contentNodes = parseLabelToNodes(tr.doc.type.schema, newLabel);
    if (contentNodes.length > 0) {
      tr.replaceWith(from, to, contentNodes);
    } else {
      tr.delete(from, to);
    }
  } else {
    tr.delete(from, to);
  }
  tr.setMeta("addToHistory", true);

  return true;
}
