import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

interface UseNodeAttributesProps<T extends FieldValues> {
  editor: Editor | null;
  element?: ProseMirrorNode;
  form: UseFormReturn<T>;
  nodeType: string;
}

export const useNodeAttributes = <T extends FieldValues>({
  editor,
  element,
  form,
  nodeType,
}: UseNodeAttributesProps<T>) => {
  // Keep track of the current node for updates
  const currentNodeRef = useRef<ProseMirrorNode | null>(null);
  const currentNodePosRef = useRef<number | null>(null);

  // Update tracked node when element changes or selection changes
  useEffect(() => {
    if (!editor || !element) return;

    const updateCurrentNode = () => {
      // Find the node with matching ID in the document
      let foundPos: number | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.attrs.id === element.attrs.id) {
          foundPos = pos;
          return false; // Stop traversing
        }
        return true;
      });

      if (foundPos !== null) {
        const node = editor.state.doc.nodeAt(foundPos);
        if (node?.type.name === nodeType) {
          currentNodeRef.current = node;
          currentNodePosRef.current = foundPos;

          // Sync form with new node's attributes
          Object.entries(node.attrs).forEach(([key, value]) => {
            const currentValue = form.getValues(key as Path<T>);
            if (currentValue !== value) {
              form.setValue(key as Path<T>, value);
            }
          });
        }
      }
    };

    // Update immediately
    updateCurrentNode();

    // Subscribe to selection changes
    editor.on("update", updateCurrentNode);

    return () => {
      editor.off("update", updateCurrentNode);
    };
  }, [editor, element, form, nodeType]);

  const updateNodeAttributes = (attrs: Record<string, unknown>) => {
    if (!editor || currentNodePosRef.current === null) {
      return;
    }

    // Check if attributes actually changed BEFORE running the command
    const currentNode = editor.state.doc.nodeAt(currentNodePosRef.current);
    if (!currentNode || currentNode.type.name !== nodeType) {
      return;
    }

    const updatedAttrs = {
      ...currentNode.attrs,
      ...attrs,
      id: currentNode.attrs.id,
    };

    const hasChanged = JSON.stringify(currentNode.attrs) !== JSON.stringify(updatedAttrs);

    if (!hasChanged) {
      return;
    }

    // Only run the command if there are actual changes
    editor
      .chain()
      .command(({ tr, dispatch }) => {
        const node = tr.doc.nodeAt(currentNodePosRef.current!);
        if (node?.type.name === nodeType && dispatch) {
          tr.setNodeMarkup(currentNodePosRef.current!, node.type, updatedAttrs);
          tr.setMeta("addToHistory", true);
          return true;
        }
        return false;
      })
      .run();
  };

  return {
    updateNodeAttributes,
  };
};
