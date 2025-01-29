import { Editor } from "@tiptap/react";
import { useCallback } from "react";
// import { ShouldShowProps } from '../../types'
import {
  isCustomNodeSelected,
  isTextSelected,
} from "@/components/Editor/utils";

export const useTextmenuStates = (editor: Editor) => {
  const isBold = useCallback(() => {
    // Check if current node is a button
    const { selection } = editor.state;
    const node = editor.state.doc.nodeAt(selection.$anchor.pos);
    if (node?.type.name === 'button') {
      return node.attrs.fontWeight === 'bold';
    }
    // Default bold check for other nodes
    return editor.isActive("bold");
  }, [editor]);

  const isItalic = useCallback(() => {
    // Check if current node is a button
    const { selection } = editor.state;
    const node = editor.state.doc.nodeAt(selection.$anchor.pos);
    if (node?.type.name === 'button') {
      return node.attrs.fontStyle === 'italic';
    }
    // Default italic check for other nodes
    return editor.isActive("italic");
  }, [editor]);

  const isUnderline = useCallback(() => {
    // Check if current node is a button
    const { selection } = editor.state;
    const node = editor.state.doc.nodeAt(selection.$anchor.pos);
    if (node?.type.name === 'button') {
      return node.attrs.isUnderline;
    }
    // Default underline check for other nodes
    return editor.isActive("underline");
  }, [editor]);

  const isStrike = useCallback(() => {
    // Check if current node is a button
    const { selection } = editor.state;
    const node = editor.state.doc.nodeAt(selection.$anchor.pos);
    if (node?.type.name === 'button') {
      return node.attrs.isStrike;
    }
    // Default strike check for other nodes
    return editor.isActive("strike");
  }, [editor]);

  const isLink = useCallback(() => editor.isActive("link"), [editor]);
  const isQuote = useCallback(() => editor.isActive("blockquote"), [editor]);

  const isAlignLeft = useCallback(
    () => editor.isActive({ textAlign: "left" }),
    [editor]
  );
  const isAlignCenter = useCallback(
    () => editor.isActive({ textAlign: "center" }),
    [editor]
  );
  const isAlignRight = useCallback(
    () => editor.isActive({ textAlign: "right" }),
    [editor]
  );
  const isAlignJustify = useCallback(
    () => editor.isActive({ textAlign: "justify" }),
    [editor]
  );

  const shouldShow = useCallback(
    // ({ view, from }: ShouldShowProps) => {
    ({ view, from }: any) => {
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
    isBold: isBold(),
    isItalic: isItalic(),
    isUnderline: isUnderline(),
    isStrike: isStrike(),
    isLink: isLink(),
    isQuote: isQuote(),
    isAlignLeft: isAlignLeft(),
    isAlignCenter: isAlignCenter(),
    isAlignRight: isAlignRight(),
    isAlignJustify: isAlignJustify(),
  };
};
