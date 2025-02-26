import { BinIcon, RemoveFormattingIcon, DuplicateIcon } from "@/components/ui-kit/Icon";
import { cn } from "@/lib";
import { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { Transform } from "@dnd-kit/utilities";
import { Editor, NodeViewWrapper, type NodeViewWrapperProps } from "@tiptap/react";
import React, { useCallback, useEffect, useState } from "react";
import { Handle } from "../Handle";
import { useSetAtom } from "jotai";
import { selectedNodeAtom } from "../TextMenu/store";
import { Divider } from "@/components/ui-kit";
import { v4 as uuidv4 } from 'uuid';
import { createOrDuplicateNode } from "../Editor/Editor";

export interface SortableItemWrapperProps extends NodeViewWrapperProps {
  children: React.ReactNode;
  id: string;
  className?: string;
  editor: Editor
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}

export const SortableItemWrapper = ({ children, id, className, ...props }: SortableItemWrapperProps) => {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({
    id,
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <SortableItem
      ref={setNodeRef}
      id={id}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      className={className}
      handleProps={{ ref: setActivatorNodeRef }}
      {...props}
    >
      {children}
    </SortableItem>
  );
};

export interface SortableItemProps {
  children: React.ReactNode;
  id?: string;
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  handleProps?: any;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  transition?: string | null;
  className?: string;
  editor: Editor
}

export const SortableItem = React.forwardRef<HTMLDivElement, SortableItemProps>(
  ({ children, className, dragOverlay, handleProps, listeners, id, transition, transform, fadeIn, editor, ...props }, ref) => {
    useEffect(() => {
      if (!dragOverlay) {
        return;
      }

      document.body.style.cursor = 'grabbing';

      return () => {
        document.body.style.cursor = '';
      };
    }, [dragOverlay]);

    const setSelectedNode = useSetAtom(selectedNodeAtom);

    // Helper function to find node position by ID
    const findNodePositionById = (state: any, targetId: string): number | null => {
      let foundPos: number | null = null;

      state.doc.descendants((node: any, pos: number) => {
        if (foundPos !== null) return false; // Stop if already found
        if (node.attrs?.id === targetId) {
          foundPos = pos;
          return false; // Stop traversal
        }
        return true; // Continue traversal
      });

      return foundPos;
    };

    // Helper function to get node and position
    const getNodeAndPosition = useCallback(() => {
      if (!editor || !id) return { node: null, pos: null };

      const pos = findNodePositionById(editor.state, id);
      if (pos === null) return { node: null, pos: null };

      const node = editor.state.doc.nodeAt(pos);
      return { node, pos };
    }, [editor, id]);

    // Common method to clear selection
    const clearSelection = useCallback(() => {
      editor.commands.blur();
      setSelectedNode(null);
    }, [editor, setSelectedNode]);

    const deleteNode = useCallback(() => {
      if (!editor || !id) return;

      try {
        // Clear selection first
        clearSelection();

        setTimeout(() => {
          const { node, pos } = getNodeAndPosition();
          if (!node || pos === null) return;

          // Check if this is the last node in the document
          const isLastNode = editor.state.doc.childCount === 1;

          // Create and dispatch a transaction directly
          const tr = editor.state.tr;
          tr.delete(pos, pos + node.nodeSize);
          tr.setMeta('addToHistory', true);

          // Dispatch the transaction
          editor.view.dispatch(tr);

          // If we deleted the last node, TipTap will automatically create an empty paragraph
          // We need to ensure it has a unique ID
          if (isLastNode) {
            setTimeout(() => {
              // The new paragraph will be at position 0
              const newNode = editor.state.doc.nodeAt(0);
              if (newNode && newNode.type.name === 'paragraph' && !newNode.attrs.id) {
                const newId = `node-${uuidv4()}`;
                const tr = editor.state.tr;
                tr.setNodeMarkup(0, undefined, { ...newNode.attrs, id: newId });
                editor.view.dispatch(tr);

                // Dispatch a custom event to notify the Editor component about the new node
                const customEvent = new CustomEvent('node-duplicated', {
                  detail: { newNodeId: newId }
                });
                document.dispatchEvent(customEvent);
              }
            }, 50);
          }

          setSelectedNode(null);
        }, 100);

      } catch (error) {
        console.error('Error deleting node:', error);
      }
    }, [editor, id, getNodeAndPosition, clearSelection, setSelectedNode]);

    const removeFormatting = useCallback(() => {
      if (!editor || !id) return;

      try {
        // Clear selection first
        clearSelection();

        setTimeout(() => {
          const { node, pos } = getNodeAndPosition();
          if (!node || pos === null) return;

          const chain = editor.chain();

          // Set node selection and remove all marks
          chain.setNodeSelection(pos).unsetAllMarks();

          // Convert to paragraph if it's not already a paragraph
          if (node.type.name !== 'paragraph') {
            chain.setParagraph();
          }

          chain.run();
        }, 100);
      } catch (error) {
        console.error('Error removing formatting:', error);
      }
    }, [editor, id, getNodeAndPosition, clearSelection]);

    const duplicateNode = useCallback(() => {
      if (!editor || !id) return;

      try {
        // Clear selection first
        clearSelection();

        setTimeout(() => {
          const { node, pos } = getNodeAndPosition();
          if (!node || pos === null) return;

          // Get the node type and attributes
          let nodeType = node.type.name;
          const nodeAttrs = { ...node.attrs };

          // Remove the id from the source attributes as we'll generate a new one
          delete nodeAttrs.id;

          // Get the position to insert the duplicate (right after the current node)
          const insertPos = pos + node.nodeSize;

          // Use the createOrDuplicateNode utility to create the duplicate
          createOrDuplicateNode(
            editor,
            nodeType,
            insertPos,
            nodeAttrs,
            setSelectedNode,
            node.content
          );

        }, 100);
      } catch (error) {
        console.error('Error duplicating node:', error);
      }
    }, [editor, id, getNodeAndPosition, clearSelection, setSelectedNode]);

    return (
      <NodeViewWrapper
        ref={ref}
        data-cypress="draggable-item"
        data-node-view-wrapper
        data-id={id}
        className={cn(
          'flex items-center justify-center gap-2 pl-6',
          className,
        )}
        style={
          {
            transition: [transition]
              .filter(Boolean)
              .join(', '),
            '--translate-x': transform
              ? `${Math.round(transform.x)}px`
              : undefined,
            '--translate-y': transform
              ? `${Math.round(transform.y)}px`
              : undefined,
            '--scale-x': transform?.scaleX
              ? `${transform.scaleX}`
              : undefined,
            '--scale-y': transform?.scaleY
              ? `${transform.scaleY}`
              : undefined,
            transform: `translate3d(var(--translate-x, 0), var(--translate-y, 0), 0) scaleX(var(--scale-x, 1)) scaleY(var(--scale-y, 1))`
          } as React.CSSProperties
        }
        {...props}
      >
        <Handle className="absolute -left-5" {...handleProps} {...listeners} />
        {children}
        <div className="actions-panel absolute -right-[50px] rounded-md border border-border bg-background shadow-sm flex items-center justify-center hidden">
          <button className="w-8 h-8 flex items-center justify-center" onClick={removeFormatting}>
            <RemoveFormattingIcon />
          </button>
          <Divider className="m-0" />
          <button className="w-8 h-8 flex items-center justify-center" onClick={duplicateNode}>
            <DuplicateIcon />
          </button>
          <Divider className="m-0" />
          <button className="w-8 h-8 flex items-center justify-center" onClick={deleteNode}>
            <BinIcon />
          </button>
        </div>
      </NodeViewWrapper>
    );
  });