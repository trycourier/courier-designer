import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import type { CustomCodeProps } from "./CustomCode.types";

export const CustomCodeComponent: React.FC<
  CustomCodeProps & {
    nodeKey?: string;
    selected?: boolean;
    updateAttributes?: (attrs: Partial<CustomCodeProps>) => void;
  }
> = ({ code }) => {
  const hasCode = code && code.trim() && code !== "<!-- Add your HTML code here -->";

  return (
    <div className="courier-w-full node-element">
      <div
        className="courier-custom-code courier-py-1.5 courier-overflow-auto"
        dangerouslySetInnerHTML={hasCode ? { __html: code } : { __html: "&#160;" }}
      />
    </div>
  );
};

export const CustomCodeComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      props.editor.commands.blur();
      const nodeId = node.attrs.id;
      props.editor.state.doc.descendants((currentNode) => {
        if (currentNode.type.name === "customCode" && currentNode.attrs.id === nodeId) {
          setSelectedNode(currentNode);
          return false; // Stop traversal
        }
        return true; // Continue traversal
      });
    }
  }, [props, setSelectedNode]);

  // Check if the custom code is empty (similar to TextBlock logic)
  const code = props.node.attrs.code;
  const isEmpty = !code || code.trim() === "" || code === "<!-- Add your HTML code here -->";

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element", isEmpty && "is-empty")}
      onClick={handleSelect}
      editor={props.editor}
      data-node-type="customCode"
    >
      <CustomCodeComponent
        {...(props.node.attrs as CustomCodeProps)}
        updateAttributes={props.updateAttributes}
      />
    </SortableItemWrapper>
  );
};
