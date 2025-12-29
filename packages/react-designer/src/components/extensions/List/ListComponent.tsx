import { cn } from "@/lib/utils";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom, useAtomValue } from "jotai";
import { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom, selectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";

/**
 * List NodeView component that renders the list.
 *
 * Uses SortableItemWrapper for proper drag-and-drop reordering,
 * selection styling, and action buttons (duplicate, delete).
 */
export const ListComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);

  const { listType, id } = props.node.attrs;

  // Check if this list is selected
  const isSelected =
    selectedNode?.type?.name === "list" &&
    (selectedNode?.attrs?.id === id || selectedNode === props.node);

  // Select the list on click
  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  const ListTag = listType === "ordered" ? "ol" : "ul";

  return (
    <SortableItemWrapper
      id={id}
      className={cn(isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
    >
      <div className="node-element">
        <ListTag
          className={cn(
            "courier-list-wrapper",
            listType === "ordered" ? "courier-list-decimal" : "courier-list-disc",
            "courier-m-0 courier-py-1 courier-pl-6"
          )}
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
