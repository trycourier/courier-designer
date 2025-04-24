import { Divider } from "@/components/ui-kit";
import { BinIcon, DuplicateIcon, RemoveFormattingIcon } from "@/components/ui-kit/Icon";
import { cn } from "@/lib";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import type { Transform } from "@dnd-kit/utilities";
import type { Node } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import type { Editor, NodeViewWrapperProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { forwardRef, useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createOrDuplicateNode } from "../../utils";
import { Handle } from "../Handle";
import { useTextmenuCommands } from "../TextMenu/hooks/useTextmenuCommands";
import { selectedNodeAtom } from "../TextMenu/store";

export interface SortableItemWrapperProps extends NodeViewWrapperProps {
  children: React.ReactNode;
  id: string;
  className?: string;
  editor: Editor;
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}

export const SortableItemWrapper = ({
  children,
  id,
  className,
  ...props
}: SortableItemWrapperProps) => {
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging, transform, transition } =
    useSortable({
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
  handleProps?: Record<string, unknown>;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  transition?: string | null;
  className?: string;
  editor: Editor;
}

export const SortableItem = forwardRef<HTMLDivElement, SortableItemProps>(
  (
    {
      children,
      className,
      dragOverlay,
      handleProps,
      listeners,
      id,
      transition,
      transform,
      editor,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fadeIn,
      ...props
    },
    ref
  ) => {
    useEffect(() => {
      if (!dragOverlay) {
        return;
      }

      document.body.style.cursor = "grabbing";

      return () => {
        document.body.style.cursor = "";
      };
    }, [dragOverlay]);

    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const { resetButtonFormatting } = useTextmenuCommands(editor);

    // Helper function to find node position by ID
    const findNodePositionById = (state: EditorState, targetId: string): number | null => {
      let foundPos: number | null = null;

      state.doc.descendants((node: Node, pos: number) => {
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
      if (!editor || !id) {
        return { node: null, pos: null };
      }

      const pos = findNodePositionById(editor.state, id);

      if (pos === null) {
        return { node: null, pos: null };
      }

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
          if (!node || pos === null) {
            return;
          }

          // Check if this is the last node in the document
          const isLastNode = editor.state.doc.childCount === 1;

          // Create and dispatch a transaction directly
          const tr = editor.state.tr;
          tr.delete(pos, pos + node?.nodeSize);
          tr.setMeta("addToHistory", true);

          // Dispatch the transaction
          editor.view.dispatch(tr);

          // If we deleted the last node, TipTap will automatically create an empty paragraph
          // We need to ensure it has a unique ID
          if (isLastNode) {
            setTimeout(() => {
              // The new paragraph will be at position 0
              const newNode = editor.state.doc.nodeAt(0);
              if (newNode && newNode.type.name === "paragraph" && !newNode.attrs.id) {
                const newId = `node-${uuidv4()}`;
                const tr = editor.state.tr;
                tr.setNodeMarkup(0, undefined, { ...newNode.attrs, id: newId });
                editor.view.dispatch(tr);

                // Dispatch a custom event to notify the Editor component about the new node
                const customEvent = new CustomEvent("node-duplicated", {
                  detail: { newNodeId: newId },
                });
                document.dispatchEvent(customEvent);
              }
            }, 50);
          }

          setSelectedNode(null);
        }, 100);
      } catch (error) {
        console.error("Error deleting node:", error);
      }
    }, [editor, id, getNodeAndPosition, clearSelection, setSelectedNode]);

    const removeFormatting = useCallback(() => {
      if (!editor || !id) return;

      try {
        // Get the current node and position
        const { node, pos } = getNodeAndPosition();
        if (!node || pos === null) return;

        // Check if this is a button node
        if (node.type.name === "button") {
          // Use the resetButtonFormatting function for buttons
          resetButtonFormatting();
          return;
        }

        // For non-button nodes, use the original formatting removal logic
        clearSelection();

        setTimeout(() => {
          const chain = editor.chain();

          // Set node selection and remove all marks
          chain.setNodeSelection(pos).unsetAllMarks();

          // For blockquote nodes, find and format the child content
          if (node.type.name === "blockquote" && node.content && node.content.firstChild) {
            const childNode = node.content.firstChild;
            // Only convert to paragraph if it's not already a paragraph
            if (childNode.type.name !== "paragraph") {
              chain.setParagraph();
            }
          }
          // For non-blockquote nodes that aren't paragraphs, convert to paragraph
          else if (node.type.name !== "paragraph" && node.type.name !== "blockquote") {
            chain.setParagraph();
          }

          chain.run();
        }, 100);
      } catch (error) {
        console.error("Error removing formatting:", error);
      }
    }, [editor, id, getNodeAndPosition, clearSelection, resetButtonFormatting]);

    const duplicateNode = useCallback(() => {
      if (!editor || !id) return;

      try {
        // Clear selection first
        clearSelection();

        setTimeout(() => {
          const { node, pos } = getNodeAndPosition();
          if (!node || pos === null) return;

          // Get the node type and attributes
          const nodeType = node.type.name;
          const nodeAttrs = { ...node.attrs };

          // Remove the id from the source attributes as we'll generate a new one
          delete nodeAttrs.id;

          // Get the position to insert the duplicate (right after the current node)
          const insertPos = pos + node?.nodeSize;

          // Use the createOrDuplicateNode utility to create the duplicate
          createOrDuplicateNode(
            editor,
            nodeType,
            insertPos,
            nodeAttrs,
            (node) => setSelectedNode(node as Node),
            node.content
          );
        }, 100);
      } catch (error) {
        console.error("Error duplicating node:", error);
      }
    }, [editor, id, getNodeAndPosition, clearSelection, setSelectedNode]);

    const { node } = getNodeAndPosition();

    return (
      <NodeViewWrapper
        ref={ref}
        data-cypress="draggable-item"
        data-node-view-wrapper
        data-id={id}
        className={cn(
          "courier-flex courier-items-center courier-justify-center courier-gap-2 courier-pl-6 draggable-item",
          className
        )}
        style={
          {
            transition: [transition].filter(Boolean).join(", "),
            "--translate-x": transform ? `${Math.round(transform.x)}px` : undefined,
            "--translate-y": transform ? `${Math.round(transform.y)}px` : undefined,
            "--scale-x": transform?.scaleX ? `${transform.scaleX}` : undefined,
            "--scale-y": transform?.scaleY ? `${transform.scaleY}` : undefined,
            transform: `translate3d(var(--translate-x, 0), var(--translate-y, 0), 0) scaleX(var(--scale-x, 1)) scaleY(var(--scale-y, 1))`,
          } as React.CSSProperties
        }
        {...props}
      >
        <Handle
          className="courier-absolute courier-left-[-20px]"
          tabIndex={-1}
          {...handleProps}
          {...listeners}
        />
        {children}
        <div className="courier-actions-panel courier-absolute courier-right-[-50px] courier-rounded-md courier-border courier-border-border courier-bg-background courier-shadow-sm courier-flex courier-items-center courier-justify-center courier-hidden">
          {node?.type.name !== "imageBlock" &&
            node?.type.name !== "divider" &&
            node?.type.name !== "spacer" && (
              <>
                <button
                  className="courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center"
                  onClick={removeFormatting}
                  tabIndex={-1}
                >
                  <RemoveFormattingIcon />
                </button>
                <Divider className="courier-m-0" />
              </>
            )}
          <button
            className="courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center"
            onClick={duplicateNode}
            tabIndex={-1}
          >
            <DuplicateIcon />
          </button>
          <Divider className="courier-m-0" />
          <button
            className="courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center"
            onClick={deleteNode}
            tabIndex={-1}
          >
            <BinIcon />
          </button>
        </div>
      </NodeViewWrapper>
    );
  }
);
