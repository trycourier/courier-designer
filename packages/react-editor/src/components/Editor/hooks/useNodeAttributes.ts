import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { FieldValues, UseFormReturn } from "react-hook-form";

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

  // Update tracked node when element changes or selection changes
  useEffect(() => {
    if (!editor || !element) return;

    const updateCurrentNode = () => {
      const { selection } = editor.state;
      const pos = selection.$anchor.pos;
      const node = editor.state.doc.nodeAt(pos);

      // Only update if it's the correct node type
      if (node?.type.name === nodeType) {
        currentNodeRef.current = node;

        // Sync form with new node's attributes
        Object.entries(node.attrs).forEach(([key, value]) => {
          const currentValue = form.getValues(key as any);
          if (currentValue !== value) {
            form.setValue(key as any, value);
          }
        });
      }
    };

    // Update immediately
    updateCurrentNode();

    // Subscribe to selection changes
    editor.on('selectionUpdate', updateCurrentNode);
    editor.on('update', updateCurrentNode);

    return () => {
      editor.off('selectionUpdate', updateCurrentNode);
      editor.off('update', updateCurrentNode);
    };
  }, [editor, element, form, nodeType]);

  const updateNodeAttributes = (attrs: Record<string, any>) => {
    if (!editor || !currentNodeRef.current) return;

    editor.commands.command(({ tr }) => {
      const pos = tr.selection.$anchor.pos;
      const node = tr.doc.nodeAt(pos);

      if (node?.type.name === nodeType) {
        tr.setNodeMarkup(pos, node.type, attrs);
        return true;
      }
      return false;
    });
  };

  return {
    updateNodeAttributes,
  };
}; 
