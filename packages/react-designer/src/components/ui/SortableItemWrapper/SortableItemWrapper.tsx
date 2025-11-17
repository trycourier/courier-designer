import { Divider } from "@/components/ui-kit";
import { BinIcon, DuplicateIcon, RemoveFormattingIcon } from "@/components/ui-kit/Icon";
import { cn } from "@/lib";
import type { Node } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import type { Editor, NodeViewWrapperProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useState,
  useRef,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
// import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { createOrDuplicateNode } from "../../utils";
import { Handle } from "../Handle";
import { useTextmenuCommands } from "../TextMenu/hooks/useTextmenuCommands";
import { selectedNodeAtom } from "../TextMenu/store";
import { DropIndicatorPlaceholder } from "../DropIndicatorPlaceholder";

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
  const elementRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  const lastEdgeRef = useRef<Edge | null>(null);
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  // Helper to get TipTap document index from node ID
  const getDocumentIndex = useCallback(() => {
    const { editor } = props;
    if (!editor || !id) return 0;

    // Iterate through only direct children of the document
    for (let i = 0; i < editor.state.doc.childCount; i++) {
      const child = editor.state.doc.child(i);
      if (child.attrs?.id === id) {
        return i;
      }
    }

    return 0;
  }, [id, props]);

  // Check if this is the last element
  const isLastElement = useCallback(() => {
    const { editor } = props;
    if (!editor) return false;

    const index = getDocumentIndex();
    return index === editor.state.doc.childCount - 1;
  }, [props, getDocumentIndex]);

  useEffect(() => {
    const element = elementRef.current;
    const handle = handleRef.current;
    const { editor } = props;

    if (!element) return;

    return combine(
      draggable({
        element,
        dragHandle: handle || undefined,
        getInitialData: () => {
          // Detect node type for drag label
          let nodeType = "text";
          if (editor) {
            const index = getDocumentIndex();
            if (index < editor.state.doc.childCount) {
              const node = editor.state.doc.child(index);
              switch (node.type.name) {
                case "heading":
                  nodeType = "heading";
                  break;
                case "paragraph":
                  nodeType = "text";
                  break;
                case "imageBlock":
                  nodeType = "image";
                  break;
                case "divider":
                  nodeType = node.attrs?.spacer ? "spacer" : "divider";
                  break;
                case "button":
                  nodeType = "button";
                  break;
                case "customCode":
                  nodeType = "customCode";
                  break;
                case "column":
                  nodeType = "column";
                  break;
              }
            }
          }

          return {
            id,
            type: "editor",
            index: getDocumentIndex(),
            dragType: nodeType,
          };
        },
        onGenerateDragPreview: () => {
          // Hide elements that shouldn't appear in drag preview
          const noDragPreviewElements = element.querySelectorAll("[data-no-drag-preview]");
          const originalDisplayValues: string[] = [];

          noDragPreviewElements.forEach((el, index) => {
            const htmlEl = el as HTMLElement;
            originalDisplayValues[index] = htmlEl.style.display;
            htmlEl.style.display = "none";
          });

          // Restore after preview is generated (in next tick)
          requestAnimationFrame(() => {
            noDragPreviewElements.forEach((el, index) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.display = originalDisplayValues[index];
            });
          });
        },
        onDragStart: () => {
          setIsDragging(true);
          document.body.style.cursor = "grabbing";

          // Temporarily disable editor to prevent text cursor
          if (editor && editor.isEditable) {
            editor.setEditable(false);
          }
        },
        onDrop: () => {
          setIsDragging(false);
          document.body.style.cursor = "";

          // Re-enable editor
          if (editor) {
            editor.setEditable(true);
          }
        },
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element: targetElement }) => {
          const data = {
            id,
            type: "editor",
            index: getDocumentIndex(),
          };
          // Attach closest edge information for proper drop positioning
          // Allow bottom edge only for the last element
          const edges: Edge[] = isLastElement() ? ["top", "bottom"] : ["top"];

          return attachClosestEdge(data, {
            input,
            element: targetElement,
            allowedEdges: edges,
          });
        },
        canDrop: ({ source }) => {
          // Only block the dragging element itself
          // (edge-specific blocking is handled in onDragEnter/onDrag)
          if (source.data.id === id) {
            return false;
          }

          return true;
        },
        onDragEnter: ({ self, source }) => {
          const edge = extractClosestEdge(self.data);
          let newEdge: Edge | null = edge;

          // Track the type being dragged
          const sourceData = source.data as { dragType?: string };
          setDragType(sourceData.dragType || null);

          // Block "top" edge of element immediately after dragging element
          if (source.data.type === "editor" && typeof source.data.index === "number") {
            const sourceIndex = source.data.index;
            const targetIndex = getDocumentIndex();

            if (targetIndex === sourceIndex + 1 && edge === "top") {
              newEdge = null;
            }
          }

          // Don't show bottom indicator if this is the last element being dragged
          if (edge === "bottom" && isLastElement() && source.data.id === id) {
            newEdge = null;
          }

          // Only update if edge actually changed (prevents unnecessary re-renders)
          if (newEdge !== lastEdgeRef.current) {
            lastEdgeRef.current = newEdge;
            setClosestEdge(newEdge);
          }
        },
        onDrag: ({ self, source }) => {
          const edge = extractClosestEdge(self.data);
          let newEdge: Edge | null = edge;

          // Track the type being dragged
          const sourceData = source.data as { dragType?: string };
          setDragType(sourceData.dragType || null);

          // Block "top" edge of element immediately after dragging element
          if (source.data.type === "editor" && typeof source.data.index === "number") {
            const sourceIndex = source.data.index;
            const targetIndex = getDocumentIndex();

            if (targetIndex === sourceIndex + 1 && edge === "top") {
              newEdge = null;
            }
          }

          // Don't show bottom indicator if this is the last element being dragged
          if (edge === "bottom" && isLastElement() && source.data.id === id) {
            newEdge = null;
          }

          // Only update if edge actually changed (prevents unnecessary re-renders)
          if (newEdge !== lastEdgeRef.current) {
            lastEdgeRef.current = newEdge;
            setClosestEdge(newEdge);
          }
        },
        onDragLeave: () => {
          lastEdgeRef.current = null;
          setClosestEdge(null);
          setDragType(null);
        },
        onDrop: () => {
          lastEdgeRef.current = null;
          setClosestEdge(null);
          setDragType(null);
        },
      })
    );
  }, [id, getDocumentIndex, isLastElement, props]);

  return (
    <SortableItem
      ref={elementRef}
      id={id}
      fadeIn={mountedWhileDragging}
      className={className}
      dragging={isDragging}
      closestEdge={closestEdge}
      dragType={dragType}
      handleRef={handleRef}
      contentRef={contentRef}
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
  closestEdge?: Edge | null;
  dragType?: string | null;
  handleRef?: React.RefObject<HTMLButtonElement>;
  contentRef?: React.RefObject<HTMLDivElement>;
  fadeIn?: boolean;
  className?: string;
  editor: Editor;
}

export interface NodeViewWrapperComponentProps extends HTMLAttributes<HTMLDivElement> {
  dragging?: never; // Prevent dragging from being passed to DOM
}

export const SortableItem = forwardRef<HTMLDivElement, SortableItemProps>(
  (
    {
      children,
      className,
      dragOverlay,
      handleRef,
      contentRef,
      closestEdge,
      dragType,
      id,
      editor,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fadeIn,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      dragging,
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
          "courier-flex courier-flex-col courier-relative draggable-item",
          //  dragging && "is-dragging courier-opacity-50",
          className
        )}
        {...props}
      >
        {/* Top edge drag indicator */}
        {closestEdge === "top" && <DropIndicatorPlaceholder type={dragType} />}

        <div className="courier-flex courier-items-center courier-justify-center courier-gap-2 courier-pl-10">
          <Handle
            ref={handleRef}
            className="courier-absolute courier-left-[-8px]"
            tabIndex={-1}
            data-no-drag-preview
          />
          <div ref={contentRef} className="courier-flex-1 courier-grow">
            {children}
          </div>
          <div
            data-no-drag-preview
            className={cn(
              "courier-actions-panel courier-absolute courier-right-[-50px] courier-rounded-lg courier-border courier-border-border courier-bg-background courier-shadow-md courier-hidden courier-items-center courier-justify-center",
              dragging && "!courier-hidden"
            )}
          >
            {node?.type.name !== "imageBlock" &&
              node?.type.name !== "divider" &&
              node?.type.name !== "spacer" &&
              node?.type.name !== "button" &&
              node?.type.name !== "column" && (
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
        </div>

        {/* Bottom edge drag indicator */}
        {closestEdge === "bottom" && <DropIndicatorPlaceholder type={dragType} />}
      </NodeViewWrapper>
    );
  }
);
