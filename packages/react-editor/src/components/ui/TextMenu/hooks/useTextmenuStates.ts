import type { Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { isCustomNodeSelected, isTextSelected } from "../../../utils";
import { selectedNodeAtom } from "../store";

export const useTextmenuStates = (editor: Editor) => {
  const selectedNode = useAtomValue(selectedNodeAtom);
  const [states, setStates] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isAlignLeft: false,
    isAlignCenter: false,
    isAlignRight: false,
    isAlignJustify: false,
    isQuote: false,
    isLink: false,
  });

  const updateStates = useCallback(() => {
    if (!editor) return;

    if (selectedNode?.type.name === "button") {
      setStates({
        isBold: selectedNode.attrs.fontWeight === "bold",
        isItalic: selectedNode.attrs.fontStyle === "italic",
        isUnderline: selectedNode.attrs.isUnderline,
        isStrike: selectedNode.attrs.isStrike,
        isAlignLeft: false,
        isAlignCenter: false,
        isAlignRight: false,
        isAlignJustify: false,
        isQuote: false,
        isLink: false,
      });
      return;
    }

    setStates({
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isUnderline: editor.isActive("underline"),
      isStrike: editor.isActive("strike"),
      isAlignLeft: editor.isActive({ textAlign: "left" }),
      isAlignCenter: editor.isActive({ textAlign: "center" }),
      isAlignRight: editor.isActive({ textAlign: "right" }),
      isAlignJustify: editor.isActive({ textAlign: "justify" }),
      isQuote: editor.isActive("blockquote"),
      isLink: editor.isActive("link"),
    });
  }, [editor, selectedNode]);

  useEffect(() => {
    if (!editor) return;

    updateStates();

    editor.on("selectionUpdate", updateStates);
    editor.on("transaction", updateStates);

    return () => {
      editor.off("selectionUpdate", updateStates);
      editor.off("transaction", updateStates);
    };
  }, [editor, updateStates]);

  const shouldShow = useCallback(
    ({ view, from }: { view: EditorView; from: number }) => {
      if (!view || editor.view.dragging) {
        return false;
      }

      const domAtPos = view.domAtPos(from || 0).node as HTMLElement;
      const nodeDOM = view.nodeDOM(from || 0) as HTMLElement;
      const node = nodeDOM || domAtPos;

      if (isCustomNodeSelected(editor, node)) {
        return false;
      }

      return isTextSelected({ editor });
    },
    [editor]
  );

  return {
    shouldShow,
    ...states,
  };
};
