import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import React, { useCallback, useState } from "react";
import type { ButtonProps } from "./Button.types";
import { useSetAtom } from "jotai";
import { setSelectedNodeAtom } from "../../components/TextMenu/store";
import { SortableItemWrapper } from "../../components/SortableItemWrapper/SortableItemWrapper";
import { v4 as uuidv4 } from 'uuid';
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
  margin,
  fontWeight,
  fontStyle,
  isUnderline,
  isStrike,
}) => {
    return (
      <div className="w-full flex" style={{ marginTop: `${margin}px`, marginBottom: `${margin}px` }}>
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
    );
  };

export const ButtonComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const [uniqueId] = useState(() => `node-${uuidv4()}`);

  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur()
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos]);

  return (
    <SortableItemWrapper id={uniqueId} className={cn(props.node.attrs.isSelected && 'selected-element')} onClick={handleSelect}>
      <ButtonComponent
        {...(props.node.attrs as ButtonProps)}
      />
    </SortableItemWrapper>
  );
};
