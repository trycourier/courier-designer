import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../components/SortableItemWrapper/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../components/TextMenu/store";
import type { ButtonProps } from "./Button.types";

export const ButtonComponent: React.FC<
  ButtonProps & {
    nodeKey?: string;
    selected?: boolean;
    fontWeight?: string;
    isUnderline?: boolean;
    isStrike?: boolean;
  }
> = ({
  label,
  alignment,
  size,
  backgroundColor,
  textColor,
  borderWidth,
  borderRadius,
  borderColor,
  padding,
  fontWeight,
  fontStyle,
  isUnderline,
  isStrike,
}) => {
    return (
      <div className="w-full node-element">
        <div className="flex" style={{ marginTop: `${padding}px`, marginBottom: `${padding}px` }}>
          <div
            className={cn(
              "inline-flex justify-center px-4 py-2 cursor-pointer text-base",
              {
                left: "mr-auto",
                center: "mx-auto",
                right: "ml-auto",
              }[alignment],
              size === "full" && "w-full"
            )}
            style={{
              backgroundColor,
              color: textColor,
              borderWidth: `${borderWidth}px`,
              borderRadius: `${borderRadius}px`,
              borderColor,
              borderStyle: borderWidth > 0 ? "solid" : "none",
              caretColor: '#ff0000',
              fontWeight,
              fontStyle,
            }}
          >
            {isStrike ? (
              <s>{isUnderline ? <u>{label}</u> : label}</s>
            ) : isUnderline ? (
              <u>{label}</u>
            ) : (
              label
            )}
          </div>
        </div>
      </div>
    );
  };

export const ButtonComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return
    }

    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur()
      const nodeId = node.attrs.id;
      props.editor.state.doc.descendants((currentNode) => {
        if (currentNode.type.name === 'button' && currentNode.attrs.id === nodeId) {
          setSelectedNode(currentNode);
          return false; // Stop traversal
        }
        return true; // Continue traversal
      });
    }
  }, [props.editor, props.getPos, setSelectedNode]);

  return (
    <SortableItemWrapper id={props.node.attrs.id} className={cn(props.node.attrs.isSelected && 'selected-element')} onClick={handleSelect} editor={props.editor} data-node-type="button">
      <ButtonComponent
        {...(props.node.attrs as ButtonProps)}
      />
    </SortableItemWrapper>
  );
};
