import { cn } from "@/lib/utils";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useSetAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom, selectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { getTierStyleVars } from "@/lib/constants/email-editor-tiptap-styles";
import { emailLineHeightAtom } from "../../TemplateEditor/store";

/**
 * List NodeView component that renders the list.
 *
 * Uses SortableItemWrapper for proper drag-and-drop reordering,
 * selection styling, and action buttons (duplicate, delete).
 *
 * When nested inside a blockquote, uses a simpler wrapper without
 * drag handles or selection behavior to let the blockquote handle those.
 */
export const ListComponentNode = (props: NodeViewProps) => {
  const { editor, node, getPos } = props;
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);

  const { listType, id, paddingVertical, paddingHorizontal, fontSize, lineHeight } = node.attrs;
  // See getTierStyleVars: a block-derived line height must not beat an explicit
  // document base, because the renderer resolves the base in before auto-scaling.
  const documentLineHeight = useAtomValue(emailLineHeightAtom);

  // Check if this list is inside a blockquote
  const isInsideBlockquote = useMemo(() => {
    const pos = getPos();
    if (typeof pos !== "number") return false;

    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 0; d--) {
      if ($pos.node(d).type.name === "blockquote") {
        return true;
      }
    }
    return false;
  }, [editor.state.doc, getPos]);

  // Check if this list is selected
  const isSelected =
    selectedNode?.type?.name === "list" &&
    (selectedNode?.attrs?.id === id || selectedNode === props.node);

  // Select the list on click (only if not inside blockquote)
  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable || isInsideBlockquote) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      setSelectedNode(node);
    }
  }, [props, setSelectedNode, isInsideBlockquote]);

  const ListTag = listType === "ordered" ? "ol" : "ul";

  // Style object for padding, plus the list's own typography overrides.
  // Items render as paragraphs, so the `p` tier vars carry the override down.
  const listStyle: React.CSSProperties = {
    ...(paddingVertical && {
      paddingTop: `${paddingVertical}px`,
      paddingBottom: `${paddingVertical}px`,
    }),
    ...(paddingHorizontal && {
      paddingLeft: `${20 + Number(paddingHorizontal)}px`,
      paddingRight: `${paddingHorizontal}px`,
    }),
    ...(getTierStyleVars("p", { fontSize, lineHeight, documentLineHeight }) as React.CSSProperties),
  };

  // If inside a blockquote, render a simple wrapper without drag/selection UI
  if (isInsideBlockquote) {
    return (
      <NodeViewWrapper className="node-list c--block c--block-list">
        <ListTag
          className={cn(
            "courier-list-wrapper",
            listType === "ordered" ? "courier-list-decimal" : "courier-list-disc",
            "courier-m-0 courier-py-1 courier-pl-6"
          )}
          style={listStyle}
          data-type="list"
          data-list-type={listType}
          data-id={id}
          data-node-id={id}
        >
          <NodeViewContent />
        </ListTag>
      </NodeViewWrapper>
    );
  }

  return (
    <SortableItemWrapper
      id={id}
      className={cn(isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
    >
      <div className="node-element c--block c--block-list">
        <ListTag
          className={cn(
            "courier-list-wrapper",
            listType === "ordered" ? "courier-list-decimal" : "courier-list-disc",
            "courier-m-0 courier-py-1 courier-pl-6"
          )}
          style={listStyle}
          data-type="list"
          data-list-type={listType}
          data-id={id}
          data-node-id={id}
        >
          <NodeViewContent />
        </ListTag>
      </div>
    </SortableItemWrapper>
  );
};

export default ListComponentNode;
