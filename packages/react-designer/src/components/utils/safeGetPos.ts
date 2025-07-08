import type { NodeViewProps } from "@tiptap/react";

/**
 * Safely gets the position from a NodeViewProps getPos function
 * @param getPos The getPos function from NodeViewProps
 * @returns The position as a number, or null if undefined
 */
export const safeGetPos = (getPos: NodeViewProps["getPos"]): number | null => {
  const pos = getPos();
  return typeof pos === "number" ? pos : null;
};

/**
 * Safely gets a node at the position returned by getPos
 * @param props NodeViewProps containing editor and getPos
 * @returns The node or null if position is invalid
 */
export const safeGetNodeAtPos = (props: NodeViewProps) => {
  const pos = safeGetPos(props.getPos);
  if (pos === null) {
    return null;
  }
  return props.editor.state.doc.nodeAt(pos);
};
