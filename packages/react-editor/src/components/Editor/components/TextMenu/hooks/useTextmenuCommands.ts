import { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { setSelectedNodeAtom } from "../store";

export const useTextmenuCommands = (editor: Editor) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const onBold = useCallback(
    () => editor.chain().focus().toggleBold().run(),
    [editor]
  );
  const onItalic = useCallback(
    () => editor.chain().focus().toggleItalic().run(),
    [editor]
  );
  const onStrike = useCallback(
    () => editor.chain().focus().toggleStrike().run(),
    [editor]
  );
  const onUnderline = useCallback(
    () => editor.chain().focus().toggleUnderline().run(),
    [editor]
  );

  const onAlignLeft = useCallback(
    () => editor.chain().focus().setTextAlign("left").run(),
    [editor]
  );
  const onAlignCenter = useCallback(
    () => editor.chain().focus().setTextAlign("center").run(),
    [editor]
  );
  const onAlignRight = useCallback(
    () => editor.chain().focus().setTextAlign("right").run(),
    [editor]
  );
  const onAlignJustify = useCallback(
    () => editor.chain().focus().setTextAlign("justify").run(),
    [editor]
  );

  const onLink = useCallback(
    (url: string, inNewTab?: boolean) =>
      editor
        .chain()
        .focus()
        .setLink({ href: url, target: inNewTab ? "_blank" : "" })
        .run(),
    [editor]
  );

  const onQuote = useCallback(
    () => {
      const isActive = editor.isActive('blockquote');
      const chain = editor.chain().focus().toggleBlockquote();
      const success = chain.run();

      if (success) {
        const { selection } = editor.state;
        const $pos = selection.$anchor;

        if (!isActive) {
          // Converting to blockquote - find the parent blockquote node
          for (let depth = $pos.depth; depth > 0; depth--) {
            const node = $pos.node(depth);
            if (node.type.name === 'blockquote') {
              setSelectedNode(node);
              break;
            }
          }
        } else {
          // Converting from blockquote - select the inner node (paragraph/heading)
          const currentNode = $pos.node();
          if (currentNode.type.name === 'paragraph' || currentNode.type.name === 'heading') {
            setSelectedNode(currentNode);
          }
        }
      }
    },
    [editor, setSelectedNode]
  );

  return {
    onBold,
    onItalic,
    onStrike,
    onUnderline,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onAlignJustify,
    onLink,
    onQuote,
  };
};
