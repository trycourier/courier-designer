import type { Editor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { selectedNodeAtom } from "../store";

export const useTextmenuStates = (editor: Editor | null) => {
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

  const shouldShow = useCallback(({ editor }: { editor: Editor }) => {
    const elements = ["paragraph", "heading", "blockquote"];
    const { $head } = editor.state.selection;

    // Check if we're directly in a supported element
    const selectedNode = $head.node();

    if (elements.includes(selectedNode.type.name) && selectedNode.attrs.isSelected) {
      return true;
    }

    // For blockquotes, check if we're inside one by traversing up the node hierarchy
    for (let depth = 1; depth <= $head.depth; depth++) {
      const node = $head.node(depth);
      if (node.type.name === "blockquote" && node.attrs.isSelected) {
        return true;
      }
    }

    return false;
  }, []);

  return {
    shouldShow,
    ...states,
  };
};
