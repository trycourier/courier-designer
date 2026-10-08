import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { variableViewModeAtom } from "../../TemplateEditor/store";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { LoopBadge } from "../shared/LoopBadge";

export const GroupComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const { loop } = props.node.attrs as { loop?: string };
  const isEmpty = props.node.childCount === 0;
  // Rendered preview shows the email as sent; every other mode shows the group.
  const showChrome = useAtomValue(variableViewModeAtom) !== "wysiwyg";

  const selectGroup = useCallback(
    (e: React.MouseEvent, { fromHandle = false } = {}) => {
      if (!props.editor.isEditable) return;
      // Cancelling mousedown on the handle would stop the native drag from starting.
      if (!fromHandle) e.preventDefault();
      e.stopPropagation();
      const id = props.node.attrs.id;
      props.editor.state.doc.descendants((node) => {
        if (node.type.name === "group" && node.attrs.id === id) {
          props.editor.commands.blur();
          setSelectedNode(node);
          return false;
        }
        return true;
      });
    },
    [props.editor, props.node.attrs.id, setSelectedNode]
  );

  // The handle, the badge and the strip around the blocks select the group;
  // clicks on the blocks go to them.
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-loop-badge]") ||
        target.closest("[data-group-hit]") ||
        target === e.currentTarget
      ) {
        selectGroup(e);
        return;
      }
      const handle = target.closest("[data-drag-handle]");
      // Only the group's own handle: most child blocks carry no data-node-type, so
      // matching on that would claim their handles too.
      if (handle && handle.closest('[data-cypress="draggable-item"]') === e.currentTarget) {
        selectGroup(e, { fromHandle: true });
      }
    },
    [selectGroup]
  );

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onMouseDown={handleMouseDown}
      editor={props.editor}
      getPos={props.getPos}
      data-node-type="group"
    >
      <div className="courier-w-full node-element c--block c--block-group courier-relative">
        {showChrome && (
          <>
            {(["left", "right"] as const).map((side) => (
              <div
                key={side}
                data-group-hit
                contentEditable={false}
                className={`c--group-hit c--group-hit-${side}`}
                aria-hidden
              />
            ))}
            <div className="c--group-frame" aria-hidden />
            <div className="c--group-drop-line" aria-hidden />
            <LoopBadge loop={loop} label="Group" />
          </>
        )}
        {isEmpty && (
          <div
            contentEditable={false}
            className="courier-py-4 courier-text-center courier-text-sm courier-text-gray-400"
          >
            Empty group
          </div>
        )}
        <NodeViewContent className="c--group-content" />
      </div>
    </SortableItemWrapper>
  );
};
