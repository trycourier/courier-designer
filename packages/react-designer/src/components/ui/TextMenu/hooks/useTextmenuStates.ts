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
    isOrderedList: false,
    isUnorderedList: false,
    isLink: false,
  });

  const updateStates = useCallback(() => {
    if (!editor) return;

    // Buttons don't support text formatting, skip formatting states
    if (selectedNode?.type.name === "button") {
      setStates({
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrike: false,
        isAlignLeft: false,
        isAlignCenter: false,
        isAlignRight: false,
        isAlignJustify: false,
        isQuote: false,
        isOrderedList: false,
        isUnorderedList: false,
        isLink: false,
      });
      return;
    }

    // For nested lists, find the CLOSEST list to determine which button should be active
    // (not any ancestor list, just the immediate one containing the cursor)
    let closestListType: string | null = null;
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node.type.name === "list") {
        closestListType = node.attrs.listType;
        break;
      }
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
      isOrderedList: closestListType === "ordered",
      isUnorderedList: closestListType === "unordered",
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

    // For blockquotes and lists, check if we're inside one by traversing up the node hierarchy
    // Show the menu if we're editing inside a blockquote or list
    for (let depth = 1; depth <= $head.depth; depth++) {
      const node = $head.node(depth);

      // Handle blockquotes
      if (node.type.name === "blockquote") {
        // Show menu if blockquote element is selected (clicked on)
        if (node.attrs.isSelected) {
          return true;
        }
        // Only show if there's an actual text selection inside the blockquote
        // (not just a cursor position, which would cause a black dot to appear)
        const hasTextSelection = editor.state.selection.from !== editor.state.selection.to;
        if (editor.isFocused && hasTextSelection) {
          return true;
        }
      }

      // Handle lists - show menu when inside a list that is selected
      if (node.type.name === "list") {
        // Show menu if list element is selected (clicked on)
        if (node.attrs.isSelected) {
          return true;
        }
        // Only show if there's an actual text selection inside the list
        const hasTextSelection = editor.state.selection.from !== editor.state.selection.to;
        if (editor.isFocused && hasTextSelection) {
          return true;
        }
      }
    }

    return false;
  }, []);

  return {
    shouldShow,
    ...states,
  };
};
