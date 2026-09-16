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
    }
  });
  return textContent;
}

export function syncButtonContentToLabelAttr(state: EditorState): Transaction | null {
  const tr = state.tr;
  let modified = false;

  state.doc.descendants((node, pos) => {
    if (node.type.name === "button") {
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
  const variableRegex = /\{\{([^}]*)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = variableRegex.exec(label)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(schema.text(label.substring(lastIndex, match.index)));
    }
    const variableName = match[1].trim();
    if (schema.nodes.variable) {
      nodes.push(schema.nodes.variable.create({ id: variableName, isInvalid: false }));
    }
    lastIndex = variableRegex.lastIndex;
  }

  if (lastIndex < label.length) {
    nodes.push(schema.text(label.substring(lastIndex)));
  }

  return nodes;
}

export function updateButtonLabelAndContent(
  tr: Transaction,
  buttonPos: number,
  newLabel: string
): boolean {
  const node = tr.doc.nodeAt(buttonPos);
  if (!node || node.type.name !== "button") {
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
