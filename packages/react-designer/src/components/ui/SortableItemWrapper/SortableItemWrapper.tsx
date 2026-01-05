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
  getPos?: (() => number) | boolean;
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
  editor,
  getPos: _getPos, // Extract getPos to prevent it from being passed to DOM element
  ...props
}: SortableItemWrapperProps) => {
  // Suppress unused variable warning for _getPos
  void _getPos;
  const elementRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  const lastEdgeRef = useRef<Edge | null>(null);
  const bottomEdgeStableRef = useRef<boolean>(false);
  const bottomEdgeClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMouseYRef = useRef<number | null>(null);
  const mouseMoveCleanupRef = useRef<(() => void) | null>(null);
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  // Type for node info result
  type NodeInfo = { node: Node; pos: number; parent: Node | null; index: number } | null;

  // Helper to find node information (position, parent, index)
  // We use a ref to store the finding function to avoid recreating it if deps change
  // But we need id and editor to be fresh.
  // Actually, we can just use editor directly in the useEffect or callback.

  const findNodeInfo = useCallback((): NodeInfo => {
    if (!editor || !id) return null;

    let result: NodeInfo = null;

    // Iterate through all descendants to find the node
    // We use descendants instead of child loop to find nested nodes (like in columns)
    editor.state.doc.descendants((node, pos, parent) => {
      if (node.attrs?.id === id) {
        // Calculate index in parent
        let index = 0;
        if (parent) {
          parent.content.forEach((child, _offset, i) => {
            if (child === node) index = i;
          });
        }
        result = { node, pos, parent, index };
        return false; // Stop traversal
      }
      return true; // Continue traversal
    });

    return result;
  }, [id, editor]);

  // Helper to check if this is the last element in its container
  const isLastElement = useCallback(() => {
    if (!editor) return false;

    const info = findNodeInfo();
    if (!info || !info.parent) return false;

    return info.index === info.parent.childCount - 1;
  }, [editor, findNodeInfo]);

  useEffect(() => {
    const element = elementRef.current;
    const handle = handleRef.current;

    if (!element) return;

    const cleanup = combine(
      draggable({
        element,
        dragHandle: handle || undefined,
        getInitialData: () => {
          const info = findNodeInfo();

          // Detect node type for drag label
          let nodeType = "text";
          if (info) {
            const node = info.node;
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
              case "list":
                nodeType = "list";
                break;
            }
          }

          const isRoot = info?.parent === editor.state.doc;
          const parentIsColumnCell = info?.parent?.type.name === "columnCell";

          return {
            id,
            type: isRoot ? "editor" : parentIsColumnCell ? "column-cell-item" : "nested-drag",
            index: info?.index ?? 0,
            dragType: nodeType,
            pos: info?.pos,
            originalIndex: info?.index ?? 0,
            // If inside column cell, include column details
            columnId: parentIsColumnCell ? info?.parent?.attrs.columnId : undefined,
            cellIndex: parentIsColumnCell ? info?.parent?.attrs.index : undefined,
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

          // Track mouse position during drag
          const handleMouseMove = (e: MouseEvent) => {
            lastMouseYRef.current = e.clientY;
          };
          document.addEventListener("mousemove", handleMouseMove);

          // Store cleanup function
          mouseMoveCleanupRef.current = () => {
            document.removeEventListener("mousemove", handleMouseMove);
          };

          // Temporarily disable editor to prevent text cursor
          if (editor && editor.isEditable) {
            editor.setEditable(false);
          }
        },
        onDrop: () => {
          setIsDragging(false);
          document.body.style.cursor = "";

          // Clean up mouse tracking
          if (mouseMoveCleanupRef.current) {
            mouseMoveCleanupRef.current();
            mouseMoveCleanupRef.current = null;
          }

          // Re-enable editor
          if (editor) {
            editor.setEditable(true);
          }
        },
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element: targetElement }) => {
          const info = findNodeInfo();
          const isRoot = info?.parent === editor.state.doc;
          const parentIsColumnCell = info?.parent?.type.name === "columnCell";

          const data = {
            id,
            type: isRoot ? "editor" : parentIsColumnCell ? "column-cell-item" : "nested-drag",
            index: info?.index ?? 0,
            pos: info?.pos,
            nodeType: info?.node.type.name,
            columnId: parentIsColumnCell ? info?.parent?.attrs.columnId : undefined,
            cellIndex: parentIsColumnCell ? info?.parent?.attrs.index : undefined,
          };

          // Check if this is a column and if we are in the "safe zone" (edges)
          // We want to disable the main editor drag indicator when dragging inside a column (over cells)
          // but allow it when dragging over the top/bottom edges of the column itself.
          const isColumn = targetElement.getAttribute("data-node-type") === "column";
          if (isColumn) {
            const rect = targetElement.getBoundingClientRect();
            const mouseY = input.clientY;
            const EDGE_ZONE = 30; // pixels from top/bottom to allow main editor drop

            const distTop = Math.abs(mouseY - rect.top);
            const distBottom = Math.abs(mouseY - rect.bottom);

            // If we are in the middle (outside edge zones), do not attach edge data
            // This prevents the visual indicator from appearing and "disables" edge-based reordering
            if (distTop > EDGE_ZONE && distBottom > EDGE_ZONE) {
              return {
                ...data,
                disableDropIndicator: true,
              };
            }
          }

          // Check if this element is INSIDE a column cell
          // If so, we want to enable edge detection relative to THIS element for local reordering
          // But we need to make sure it doesn't conflict with main editor reordering
          const columnCellParent = targetElement.closest('[data-column-cell="true"]');
          if (columnCellParent) {
            // It's inside a column cell. Standard edge detection will work,
            // but we need to ensure the drop handler knows this is a nested drag
            // The type "nested-drag" or "column-cell-item" in source data helps
          }

          // For the last element, create a more forgiving bottom edge detection
          if (isLastElement() && element) {
            const rect = element.getBoundingClientRect();
            const mouseY = input.clientY;
            const elementMidpoint = rect.top + rect.height / 2;

            // If mouse is below the midpoint (even slightly), prefer bottom edge
            // This creates a larger "bottom zone" that's more stable
            if (mouseY >= elementMidpoint) {
              // If mouse is significantly below the element, definitely use bottom edge
              if (mouseY > rect.bottom) {
                return {
                  ...data,
                  [Symbol.for("closestEdge")]: "bottom",
                };
              }
              // If mouse is in the lower half of the element, prefer bottom edge
              // but still use attachClosestEdge for proper calculation
            }
          }

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
        onDragEnter: ({ self, source, location }) => {
          // Check if drop indicator is disabled (e.g. inside Column center)
          if (self.data.disableDropIndicator) {
            setClosestEdge(null);
            return;
          }

          // Clear any pending timeout when re-entering
          if (bottomEdgeClearTimeoutRef.current) {
            clearTimeout(bottomEdgeClearTimeoutRef.current);
            bottomEdgeClearTimeoutRef.current = null;
          }

          // Check for nested drop targets (Issue 1 fix)
          const dropTargets = location.current.dropTargets;
          if (dropTargets.length > 0 && dropTargets[0].element !== element) {
            // We are overlapping with a nested target (which is foremost)
            // Hide our indicator
            setClosestEdge(null);
            // Also clear any stable bottom edge
            bottomEdgeStableRef.current = false;
            lastEdgeRef.current = null;
            return;
          }

          const edge = extractClosestEdge(self.data);
          let newEdge: Edge | null = edge;
          const isLast = isLastElement();

          // Get real-time mouse position from the event
          const currentMouseY = location?.current?.input?.clientY ?? lastMouseYRef.current;
          if (currentMouseY !== null) {
            lastMouseYRef.current = currentMouseY;
          }

          // Track the type being dragged
          const sourceData = source.data as { dragType?: string };
          setDragType(sourceData.dragType || null);

          // Don't show bottom indicator if this is the last element being dragged
          if (edge === "bottom" && isLast && source.data.id === id) {
            newEdge = null;
          }

          // For the last element, prioritize stability - check this BEFORE other edge logic
          // Only apply stability when dragging within the editor (not from sidebar)
          const isEditorDrag =
            source.data.type === "editor" || source.data.type === "column-cell-item";
          if (isLast && isEditorDrag) {
            // If we detect "top" edge, check mouse position to determine if we should trust it
            if (edge === "top") {
              const element = elementRef.current;
              if (element) {
                const rect = element.getBoundingClientRect();
                // Use real-time mouse position, fallback to tracked position, then element midpoint
                const mouseY = currentMouseY ?? lastMouseYRef.current ?? rect.top + rect.height / 2;
                const elementMidpoint = rect.top + rect.height / 2;
                const elementHeight = rect.height;
                // Use relative threshold: 30% of element height, minimum 10px, maximum 30px
                // This works better for narrow elements like dividers
                const TOP_THRESHOLD = Math.max(10, Math.min(30, elementHeight * 0.3));

                // If mouse is clearly above the element, allow top edge and clear stability
                if (mouseY < elementMidpoint - TOP_THRESHOLD) {
                  bottomEdgeStableRef.current = false;
                  newEdge = "top";
                } else if (bottomEdgeStableRef.current) {
                  // If we have stability and mouse is not clearly above, maintain bottom
                  newEdge = "bottom";
                } else {
                  // No stability set yet, and mouse is near midpoint - allow top if detected
                  newEdge = "top";
                }
              } else {
                // No element ref, allow top edge if detected
                bottomEdgeStableRef.current = false;
                newEdge = "top";
              }
            } else if (bottomEdgeStableRef.current) {
              // We have stability set, maintain bottom edge unless we get clear top signal
              newEdge = "bottom";
            } else if (edge === "bottom") {
              // First time detecting bottom edge - lock it in
              bottomEdgeStableRef.current = true;
              newEdge = "bottom";
            }
            // If edge is null and we're not stable, let it be null (but don't set stable state)
          } else if (isLast && !isEditorDrag) {
            // When dragging from sidebar, reset stability and allow normal edge detection
            bottomEdgeStableRef.current = false;
          }

          // Block "top" edge of element immediately after dragging element
          // (but only if we're not maintaining a stable bottom edge)
          if (
            !bottomEdgeStableRef.current &&
            (source.data.type === "editor" || source.data.type === "column-cell-item") &&
            typeof source.data.index === "number"
          ) {
            const sourceIndex = source.data.index;
            const targetInfo = findNodeInfo();
            const targetIndex = targetInfo?.index ?? 0;

            // Only if in same container
            // This requires checking container match, but simple index check is mostly safe locally
            if (targetIndex === sourceIndex + 1 && edge === "top") {
              // If parent is same (we assume so for local optimization, drop handler does real check)
              newEdge = null;
            }
          }

          // Only update if edge actually changed (prevents unnecessary re-renders)
          if (newEdge !== lastEdgeRef.current) {
            lastEdgeRef.current = newEdge;
            setClosestEdge(newEdge);
          }
        },
        onDrag: ({ self, source, location }) => {
          // Check if drop indicator is disabled (e.g. inside Column center)
          if (self.data.disableDropIndicator) {
            setClosestEdge(null);
            return;
          }

          // Clear any pending timeout when dragging (mouse is still over element)
          if (bottomEdgeClearTimeoutRef.current) {
            clearTimeout(bottomEdgeClearTimeoutRef.current);
            bottomEdgeClearTimeoutRef.current = null;
          }

          // Check for nested drop targets (Issue 1 fix)
          const dropTargets = location.current.dropTargets;
          if (dropTargets.length > 0 && dropTargets[0].element !== element) {
            setClosestEdge(null);
            return;
          }

          // Get real-time mouse position from the event
          const currentMouseY = location?.current?.input?.clientY ?? lastMouseYRef.current;
          if (currentMouseY !== null) {
            lastMouseYRef.current = currentMouseY;
          }

          const edge = extractClosestEdge(self.data);
          let newEdge: Edge | null = edge;
          const isLast = isLastElement();

          // Track the type being dragged
          const sourceData = source.data as { dragType?: string };
          setDragType(sourceData.dragType || null);

          // Don't show bottom indicator if this is the last element being dragged
          if (edge === "bottom" && isLast && source.data.id === id) {
            newEdge = null;
          }

          // For the last element, prioritize stability - check this BEFORE other edge logic
          // Only apply stability when dragging within the editor (not from sidebar)
          const isEditorDrag =
            source.data.type === "editor" || source.data.type === "column-cell-item";
          if (isLast && isEditorDrag) {
            // If we detect "top" edge, check mouse position to determine if we should trust it
            if (edge === "top") {
              const element = elementRef.current;
              if (element) {
                const rect = element.getBoundingClientRect();
                // Use real-time mouse position, fallback to tracked position, then element midpoint
                const mouseY = currentMouseY ?? lastMouseYRef.current ?? rect.top + rect.height / 2;
                const elementMidpoint = rect.top + rect.height / 2;
                const elementHeight = rect.height;
                // Use relative threshold: 30% of element height, minimum 10px, maximum 30px
                // This works better for narrow elements like dividers
                const TOP_THRESHOLD = Math.max(10, Math.min(30, elementHeight * 0.3));

                // If mouse is clearly above the element, allow top edge and clear stability
                if (mouseY < elementMidpoint - TOP_THRESHOLD) {
                  bottomEdgeStableRef.current = false;
                  newEdge = "top";
                } else if (bottomEdgeStableRef.current) {
                  // If we have stability and mouse is not clearly above, maintain bottom
                  newEdge = "bottom";
                } else {
                  // No stability set yet, and mouse is near midpoint - allow top if detected
                  newEdge = "top";
                }
              } else {
                // No element ref, allow top edge if detected
                bottomEdgeStableRef.current = false;
                newEdge = "top";
              }
            } else if (bottomEdgeStableRef.current) {
              // We have stability set, maintain bottom edge unless we get clear top signal
              newEdge = "bottom";
            } else if (edge === "bottom") {
              // First time detecting bottom edge - lock it in
              bottomEdgeStableRef.current = true;
              newEdge = "bottom";
            }
            // If edge is null and we're not stable, let it be null (but don't set stable state)
          } else if (isLast && !isEditorDrag) {
            // When dragging from sidebar, reset stability and allow normal edge detection
            bottomEdgeStableRef.current = false;
          }

          // Block "top" edge of element immediately after dragging element
          // (but only if we're not maintaining a stable bottom edge)
          if (
            !bottomEdgeStableRef.current &&
            (source.data.type === "editor" || source.data.type === "column-cell-item") &&
            typeof source.data.index === "number"
          ) {
            const sourceIndex = source.data.index;
            const targetInfo = findNodeInfo();
            const targetIndex = targetInfo?.index ?? 0;

            if (targetIndex === sourceIndex + 1 && edge === "top") {
              newEdge = null;
            }
          }

          // Only update if edge actually changed (prevents unnecessary re-renders)
          if (newEdge !== lastEdgeRef.current) {
            lastEdgeRef.current = newEdge;
            setClosestEdge(newEdge);
          }
        },
        onDragLeave: () => {
          // For the last element with stable bottom edge, don't clear immediately
          // This prevents flickering when mouse briefly leaves the element bounds
          // Use a timeout to clear if mouse doesn't return within a reasonable time
          if (isLastElement() && bottomEdgeStableRef.current) {
            // Check if mouse is still below the element (user wants to drop at bottom)
            const elementRect = element?.getBoundingClientRect();
            const mouseY = lastMouseYRef.current;

            // If mouse is below the element's bottom edge, keep the indicator stable
            // This handles the case where mouse moves into empty space below the last element
            if (elementRect && mouseY !== null && mouseY >= elementRect.bottom - 10) {
              // Mouse is in the "bottom drop zone" - don't clear, just return
              // The indicator will stay visible
              return;
            }

            // Clear any existing timeout
            if (bottomEdgeClearTimeoutRef.current) {
              clearTimeout(bottomEdgeClearTimeoutRef.current);
            }
            // Set a timeout to clear the stable bottom edge if mouse doesn't return
            bottomEdgeClearTimeoutRef.current = setTimeout(() => {
              bottomEdgeStableRef.current = false;
              lastEdgeRef.current = null;
              setClosestEdge(null);
              setDragType(null);
              bottomEdgeClearTimeoutRef.current = null;
            }, 150); // Short delay to prevent flicker, but clear if mouse moves away
          } else {
            // Not last element or not stable, clear normally
            if (bottomEdgeClearTimeoutRef.current) {
              clearTimeout(bottomEdgeClearTimeoutRef.current);
              bottomEdgeClearTimeoutRef.current = null;
            }
            bottomEdgeStableRef.current = false;
            lastEdgeRef.current = null;
            setClosestEdge(null);
            setDragType(null);
          }
        },
        onDrop: () => {
          // Clear any pending timeout
          if (bottomEdgeClearTimeoutRef.current) {
            clearTimeout(bottomEdgeClearTimeoutRef.current);
            bottomEdgeClearTimeoutRef.current = null;
          }
          // Reset bottom edge stability
          bottomEdgeStableRef.current = false;
          lastEdgeRef.current = null;
          setClosestEdge(null);
          setDragType(null);
        },
      })
    );

    // Cleanup function
    return () => {
      if (bottomEdgeClearTimeoutRef.current) {
        clearTimeout(bottomEdgeClearTimeoutRef.current);
        bottomEdgeClearTimeoutRef.current = null;
      }
      cleanup();
    };
  }, [id, isLastElement, editor, findNodeInfo]);

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
      editor={editor}
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
      if (!editor || !id) {
        return;
      }

      try {
        // Get node and position BEFORE any operations
        const { node, pos } = getNodeAndPosition();
        if (!node || pos === null) {
          return;
        }

        // Capture nodeSize before any state changes
        const nodeSize = node.nodeSize;

        // Check if this is the last node in the document
        const isLastNode = editor.state.doc.childCount === 1;

        // Clear selection state
        setSelectedNode(null);
        editor.commands.updateSelectionState(null);

        // Delete immediately without setTimeout to avoid state drift
        const tr = editor.state.tr;
        tr.delete(pos, pos + nodeSize);
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
      } catch (error) {
        console.error("Error deleting node:", error);
      }
    }, [editor, id, getNodeAndPosition, setSelectedNode]);

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

        const isBlockquote = node.type.name === "blockquote";
        const isHeading = node.type.name === "heading";

        // For non-button nodes, use the original formatting removal logic
        // Don't clear selection for blockquote or heading to keep cursor in place until setTimeout
        if (!isBlockquote && !isHeading) {
          clearSelection();
        }

        setTimeout(() => {
          // For headings, use text selection to remove marks without affecting node type
          if (isHeading) {
            const startPos = pos + 1;
            const endPos = pos + node.nodeSize - 1;

            // Select all content inside the heading and remove marks, then blur
            editor
              .chain()
              .setTextSelection({ from: startPos, to: endPos })
              .unsetAllMarks()
              .blur()
              .run();

            // Clear selection state after formatting removal
            setSelectedNode(null);
            editor.commands.updateSelectionState(null);

            return;
          }

          const chain = editor.chain();

          // Set node selection and remove all marks
          chain.setNodeSelection(pos).unsetAllMarks();

          // For blockquote nodes, find and format the child content
          if (isBlockquote && node.content && node.content.firstChild) {
            const childNode = node.content.firstChild;
            // Only convert to paragraph if it's not already a paragraph
            if (childNode.type.name !== "paragraph") {
              chain.setParagraph();
            }
          }
          // For non-blockquote nodes that aren't paragraphs, convert to paragraph
          else if (node.type.name !== "paragraph" && !isBlockquote) {
            chain.setParagraph();
          }

          chain.run();

          // For blockquote, keep focus inside after removing formatting
          if (isBlockquote) {
            // Re-select the node after formatting is removed
            const newNodeAndPos = getNodeAndPosition();
            if (newNodeAndPos.node && newNodeAndPos.pos !== null) {
              setSelectedNode(newNodeAndPos.node);
              editor.commands.updateSelectionState(newNodeAndPos.node);
            }
          }
        }, 100);
      } catch (error) {
        console.error("Error removing formatting:", error);
      }
    }, [editor, id, getNodeAndPosition, clearSelection, resetButtonFormatting, setSelectedNode]);

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
          <div ref={contentRef} className="courier-flex-1 courier-grow draggable-content-wrapper">
            {children}
          </div>
          <div
            data-no-drag-preview
            className={cn(
              "courier-actions-panel courier-absolute courier-right-[-50px] courier-rounded-lg courier-border courier-border-border courier-bg-background courier-shadow-md courier-hidden courier-items-center courier-justify-center hover:courier-z-[100000]",
              dragging && "!courier-hidden"
            )}
          >
            {node?.type.name !== "imageBlock" &&
              node?.type.name !== "divider" &&
              node?.type.name !== "spacer" &&
              node?.type.name !== "button" &&
              node?.type.name !== "column" &&
              node?.type.name !== "customCode" && (
                <>
                  <button
                    className="courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center courier-text-[#171717] dark:courier-text-white dark:hover:courier-bg-secondary"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFormatting();
                    }}
                    tabIndex={-1}
                  >
                    <RemoveFormattingIcon color="currentColor" />
                  </button>
                  <Divider className="!courier-my-0" />
                </>
              )}
            <button
              className="courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center courier-text-[#171717] dark:courier-text-white dark:hover:courier-bg-secondary"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                duplicateNode();
              }}
              tabIndex={-1}
            >
              <DuplicateIcon color="currentColor" />
            </button>
            <Divider className="!courier-my-0" />
            <button
              className="courier-w-8 courier-h-8 courier-flex courier-items-center courier-justify-center courier-text-[#DC2626] dark:courier-text-red-500 dark:hover:courier-bg-secondary"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                deleteNode();
              }}
              tabIndex={-1}
            >
              <BinIcon color="currentColor" />
            </button>
          </div>
        </div>

        {/* Bottom edge drag indicator */}
        {closestEdge === "bottom" && <DropIndicatorPlaceholder type={dragType} />}
      </NodeViewWrapper>
    );
  }
);
