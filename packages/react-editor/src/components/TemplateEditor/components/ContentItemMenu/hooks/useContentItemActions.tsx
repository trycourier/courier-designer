import { Node } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { createOrDuplicateNode } from "../../Editor/utils";

const useContentItemActions = (
  editor: Editor,
  currentNode: Node | null,
  currentNodePos: number
) => {
  const resetTextFormatting = useCallback(() => {
    const chain = editor.chain();

    chain.setNodeSelection(currentNodePos).unsetAllMarks();

    if (currentNode?.type.name !== "paragraph") {
      chain.setParagraph();
    }

    chain.run();
  }, [editor, currentNodePos, currentNode?.type.name]);

  const duplicateNode = useCallback(() => {
    if (!currentNode || currentNodePos === -1) return;

    // Get the node type and attributes
    const nodeType = currentNode.type.name;
    const nodeAttrs = { ...currentNode.attrs };

    // Remove the id from the source attributes as we'll generate a new one
    delete nodeAttrs.id;

    // Get the position to insert the duplicate (right after the current node)
    const insertPos = currentNodePos + currentNode?.nodeSize;

    // Use the createOrDuplicateNode utility to create the duplicate
    createOrDuplicateNode(editor, nodeType, insertPos, nodeAttrs, undefined, currentNode.content);
  }, [editor, currentNode, currentNodePos]);

  const copyNodeToClipboard = useCallback(() => {
    editor.chain().setMeta("hideDragHandle", true).setNodeSelection(currentNodePos).run();

    document.execCommand("copy");
  }, [editor, currentNodePos]);

  const deleteNode = useCallback(() => {
    editor
      .chain()
      .setMeta("hideDragHandle", true)
      .setNodeSelection(currentNodePos)
      .deleteSelection()
      .run();
  }, [editor, currentNodePos]);

  const handleAdd = useCallback(() => {
    if (currentNodePos !== -1) {
      const currentNodeSize = currentNode?.nodeSize || 0;
      const insertPos = currentNodePos + currentNodeSize;
      const currentNodeIsEmptyParagraph =
        currentNode?.type.name === "paragraph" && currentNode?.content?.size === 0;
      const focusPos = currentNodeIsEmptyParagraph ? currentNodePos + 2 : insertPos + 2;

      editor
        .chain()
        .command(({ dispatch, tr, state }) => {
          if (dispatch) {
            if (currentNodeIsEmptyParagraph) {
              tr.insertText("/", currentNodePos, currentNodePos + 1);
            } else {
              tr.insert(
                insertPos,
                state.schema.nodes.paragraph.create(null, [state.schema.text("/")])
              );
            }

            return dispatch(tr);
          }

          return true;
        })
        .focus(focusPos)
        .run();
    }
  }, [currentNode, currentNodePos, editor]);

  return {
    resetTextFormatting,
    duplicateNode,
    copyNodeToClipboard,
    deleteNode,
    handleAdd,
  };
};

export default useContentItemActions;
