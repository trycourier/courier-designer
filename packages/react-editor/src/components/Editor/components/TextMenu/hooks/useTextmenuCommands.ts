import { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { setSelectedNodeAtom, selectedNodeAtom } from "../store";

export const useTextmenuCommands = (editor: Editor) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);

  // Helper function to find a node position by ID
  const findNodePositionById = useCallback((id: string) => {
    let nodePos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs?.id === id) {
        nodePos = pos;
        return false; // Stop traversal
      }
      return true; // Continue traversal
    });
    return nodePos;
  }, [editor]);

  // Helper function to update button attributes
  const updateButtonAttribute = useCallback((attributeName: string, newValue: any) => {
    if (selectedNode?.type?.name === 'button' && selectedNode.attrs?.id) {
      const nodeId = selectedNode.attrs.id;
      const nodePos = findNodePositionById(nodeId);

      if (nodePos >= 0) {
        // Update the node attributes
        const tr = editor.state.tr;
        tr.setNodeMarkup(nodePos, undefined, {
          ...editor.state.doc.nodeAt(nodePos)?.attrs,
          [attributeName]: newValue
        });

        // Dispatch the transaction
        editor.view.dispatch(tr);

        // Ensure button remains selected
        setTimeout(() => {
          const updatedNodePos = findNodePositionById(nodeId);
          if (updatedNodePos >= 0) {
            const updatedNode = editor.state.doc.nodeAt(updatedNodePos);
            if (updatedNode) {
              setSelectedNode(updatedNode);
            }
          }
        }, 0);

        return true;
      }
    }

    return false;
  }, [editor, selectedNode, findNodePositionById, setSelectedNode]);

  // Helper function to reset all button formatting
  const resetButtonFormatting = useCallback(() => {
    if (selectedNode?.type?.name === 'button' && selectedNode.attrs?.id) {
      const nodeId = selectedNode.attrs.id;
      const nodePos = findNodePositionById(nodeId);

      if (nodePos >= 0) {
        const currentNode = editor.state.doc.nodeAt(nodePos);
        if (!currentNode) return false;

        // Create a new attributes object with formatting reset to defaults
        const newAttrs = {
          ...currentNode.attrs,
          fontWeight: 'normal',
          fontStyle: 'normal',
          isUnderline: false,
          isStrike: false
        };

        // Update the node attributes
        const tr = editor.state.tr;
        tr.setNodeMarkup(nodePos, undefined, newAttrs);

        // Dispatch the transaction
        editor.view.dispatch(tr);

        // Ensure button remains selected
        setTimeout(() => {
          const updatedNodePos = findNodePositionById(nodeId);
          if (updatedNodePos >= 0) {
            const updatedNode = editor.state.doc.nodeAt(updatedNodePos);
            if (updatedNode) {
              setSelectedNode(updatedNode);
            }
          }
        }, 0);

        return true;
      }
    }

    return false;
  }, [editor, selectedNode, findNodePositionById, setSelectedNode]);

  const onBold = useCallback(
    () => {
      if (selectedNode?.type?.name === 'button') {
        const newFontWeight = selectedNode.attrs.fontWeight === 'bold' ? 'normal' : 'bold';
        const result = updateButtonAttribute('fontWeight', newFontWeight);
        if (result) return true;
      }

      return editor.chain()
        .focus()
        .toggleBold()
        .run();
    },
    [editor, selectedNode, updateButtonAttribute]
  );

  const onItalic = useCallback(
    () => {
      if (selectedNode?.type?.name === 'button') {
        const newFontStyle = selectedNode.attrs.fontStyle === 'italic' ? 'normal' : 'italic';
        const result = updateButtonAttribute('fontStyle', newFontStyle);
        if (result) return true;
      }

      return editor.chain()
        .focus()
        .toggleItalic()
        .run();
    },
    [editor, selectedNode, updateButtonAttribute]
  );

  const onStrike = useCallback(
    () => {
      if (selectedNode?.type?.name === 'button') {
        const newIsStrike = !selectedNode.attrs.isStrike;
        const result = updateButtonAttribute('isStrike', newIsStrike);
        if (result) return true;
      }

      return editor.chain()
        .focus()
        .toggleMark('strike')
        .run();
    },
    [editor, selectedNode, updateButtonAttribute]
  );

  const onUnderline = useCallback(
    () => {
      if (selectedNode?.type?.name === 'button') {
        const newIsUnderline = !selectedNode.attrs.isUnderline;
        const result = updateButtonAttribute('isUnderline', newIsUnderline);
        if (result) return true;
      }

      return editor.chain()
        .focus()
        .toggleMark('underline')
        .run();
    },
    [editor, selectedNode, updateButtonAttribute]
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
    resetButtonFormatting,
  };
};
