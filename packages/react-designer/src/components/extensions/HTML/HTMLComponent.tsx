import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { variableValuesAtom, type VariableViewMode } from "../../TemplateEditor/store";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { renderVariablesInHtmlString } from "../../utils/htmlBlockVariables";
import { getVariableViewMode } from "../Variable/variable-storage.utils";
import type { HTMLProps } from "./HTML.types";

export const HTMLComponent: React.FC<
  HTMLProps & {
    nodeKey?: string;
    selected?: boolean;
    updateAttributes?: (attrs: Partial<HTMLProps>) => void;
    variableViewMode?: VariableViewMode;
  }
> = ({ code, variableViewMode = "show-variables" }) => {
  const variableValues = useAtomValue(variableValuesAtom);
  const hasCode = code && code.trim() && code !== "<!-- Add your HTML code here -->";

  const renderedCode = useMemo(
    () => (hasCode ? renderVariablesInHtmlString(code, variableValues, variableViewMode) : ""),
    [hasCode, code, variableValues, variableViewMode]
  );

  return (
    <div className="courier-w-full node-element">
      <div
        className="courier-html-code courier-py-1.5"
        dangerouslySetInnerHTML={hasCode ? { __html: renderedCode } : { __html: "&#160;" }}
      />
    </div>
  );
};

export const HTMLComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const { editor } = props;

  const [variableViewMode, setVariableViewMode] = useState<VariableViewMode>(() =>
    getVariableViewMode(editor)
  );

  // The view-mode toggle lives in editor storage and only announces itself
  // through this transaction meta, same as VariableView.
  useEffect(() => {
    const handleTransaction = ({
      transaction,
    }: {
      transaction: { getMeta: (key: string) => boolean | undefined };
    }) => {
      if (transaction.getMeta("variableViewModeChanged")) {
        setVariableViewMode(getVariableViewMode(editor));
      }
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor]);

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
          return false;
        }
        return true;
      });
    }
  }, [props, setSelectedNode]);

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
      <HTMLComponent
        {...(props.node.attrs as HTMLProps)}
        updateAttributes={props.updateAttributes}
        variableViewMode={variableViewMode}
      />
    </SortableItemWrapper>
  );
};
