import type { Editor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { TextMenuConfig } from "../config";
import { selectedNodeAtom, setSelectedNodeAtom } from "../store";
import { useConditionalRules } from "./useConditionalRules";

interface TextMenuStates {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isQuote: boolean;
  isOrderedList: boolean;
  isUnorderedList: boolean;
  isAlignLeft: boolean;
  isAlignCenter: boolean;
  isAlignRight: boolean;
  isAlignJustify: boolean;
  isLink: boolean;
}

export const useTextmenuCommands = (
  editor: Editor,
  config?: TextMenuConfig,
  states?: TextMenuStates
) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const ruleProcessor = useConditionalRules(config, editor, states);

  // Helper function to find a node position by ID
  const findNodePositionById = useCallback(
    (id: string) => {
      let nodePos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.attrs?.id === id) {
          nodePos = pos;
          return false; // Stop traversal
        }
        return true; // Continue traversal
      });
      return nodePos;
    },
    [editor]
  );

  // Helper function to update button attributes
  const updateButtonAttribute = useCallback(
    (attributeName: string, newValue: unknown) => {
      if (selectedNode?.type?.name === "button" && selectedNode.attrs?.id) {
        const nodeId = selectedNode.attrs.id;
        const nodePos = findNodePositionById(nodeId);

        if (nodePos >= 0) {
          // Update the node attributes
          const tr = editor.state.tr;
          tr.setNodeMarkup(nodePos, undefined, {
            ...editor.state.doc.nodeAt(nodePos)?.attrs,
            [attributeName]: newValue,
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
    },
    [editor, selectedNode, findNodePositionById, setSelectedNode]
  );

  // Helper function to reset all button formatting
  const resetButtonFormatting = useCallback(() => {
    if (selectedNode?.type?.name === "button" && selectedNode.attrs?.id) {
      const nodeId = selectedNode.attrs.id;
      const nodePos = findNodePositionById(nodeId);

      if (nodePos >= 0) {
        const currentNode = editor.state.doc.nodeAt(nodePos);
        if (!currentNode) return false;

        // Create a new attributes object with formatting reset to defaults
        const newAttrs = {
          ...currentNode.attrs,
          fontWeight: "normal",
          fontStyle: "normal",
          isUnderline: false,
          isStrike: false,
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

  const onBold = useCallback(() => {
    if (selectedNode?.type?.name === "button") {
      const newFontWeight = selectedNode.attrs.fontWeight === "bold" ? "normal" : "bold";
      const result = updateButtonAttribute("fontWeight", newFontWeight);
      if (result) return true;
    }

    if (ruleProcessor && states) {
      const rule = ruleProcessor.getRuleForItem("bold");
      if (rule && rule.action.type === "toggle_off") {
        const chain = editor.chain().focus();
        rule.action.targets.forEach((target) => {
          if (target === "italic" && states.isItalic) {
            chain.toggleItalic();
          }
        });
        chain.toggleBold().run();
        return true;
      }
    }

    return editor.chain().focus().toggleBold().run();
  }, [editor, selectedNode, updateButtonAttribute, ruleProcessor, states]);

  const onItalic = useCallback(() => {
    if (selectedNode?.type?.name === "button") {
      const newFontStyle = selectedNode.attrs.fontStyle === "italic" ? "normal" : "italic";
      const result = updateButtonAttribute("fontStyle", newFontStyle);
      if (result) return true;
    }

    if (ruleProcessor && states) {
      const rule = ruleProcessor.getRuleForItem("italic");
      if (rule && rule.action.type === "toggle_off") {
        const chain = editor.chain().focus();
        rule.action.targets.forEach((target) => {
          if (target === "bold" && states.isBold) {
            chain.toggleBold();
          }
        });
        chain.toggleItalic().run();
        return true;
      }
    }

    return editor.chain().focus().toggleItalic().run();
  }, [editor, selectedNode, updateButtonAttribute, ruleProcessor, states]);

  const onStrike = useCallback(() => {
    if (selectedNode?.type?.name === "button") {
      const newIsStrike = !selectedNode.attrs.isStrike;
      const result = updateButtonAttribute("isStrike", newIsStrike);
      if (result) return true;
    }

    return editor.chain().focus().toggleMark("strike").run();
  }, [editor, selectedNode, updateButtonAttribute]);

  const onUnderline = useCallback(() => {
    if (selectedNode?.type?.name === "button") {
      const newIsUnderline = !selectedNode.attrs.isUnderline;
      const result = updateButtonAttribute("isUnderline", newIsUnderline);
      if (result) return true;
    }

    return editor.chain().focus().toggleMark("underline").run();
  }, [editor, selectedNode, updateButtonAttribute]);

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

  const onQuote = useCallback(() => {
    // Check if we're inside a list
    if (editor.isActive("list")) {
      const { $from } = editor.state.selection;

      // Find the list node and check if it's inside a blockquote
      let listDepth = -1;
      let blockquoteDepth = -1;
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type.name === "list" && listDepth === -1) {
          listDepth = d;
        }
        if ($from.node(d).type.name === "blockquote") {
          blockquoteDepth = d;
          break;
        }
      }

      if (listDepth === -1) return;

      const listNode = $from.node(listDepth);
      const listStart = $from.before(listDepth);
      const listEnd = $from.after(listDepth);

      // Collect content from all list items, joining with hard breaks
      const allContent: ReturnType<typeof editor.state.schema.nodes.hardBreak.create>[] = [];
      let isHeading = false;
      let headingLevel = 1;

      listNode.forEach((listItem, _offset, index) => {
        // Add hard break between items (not before the first one)
        if (index > 0) {
          allContent.push(editor.state.schema.nodes.hardBreak.create());
        }

        // Add content from the list item's first child
        listItem.forEach((child) => {
          if (child.type.name === "heading") {
            isHeading = true;
            headingLevel = child.attrs.level || 1;
            child.content.forEach((node) => {
              allContent.push(node);
            });
          } else if (child.type.name === "paragraph") {
            child.content.forEach((node) => {
              allContent.push(node);
            });
          }
        });
      });

      // Create inner content node (paragraph or heading)
      let innerNode;
      if (isHeading) {
        innerNode = editor.state.schema.nodes.heading.create(
          { id: `node-${uuidv4()}`, level: headingLevel },
          allContent.length > 0 ? allContent : undefined
        );
      } else {
        innerNode = editor.state.schema.nodes.paragraph.create(
          { id: `node-${uuidv4()}` },
          allContent.length > 0 ? allContent : undefined
        );
      }

      // If list is inside a blockquote, just replace the list with the paragraph/heading
      // (remove list formatting but keep the blockquote)
      if (blockquoteDepth !== -1) {
        const tr = editor.state.tr.replaceWith(listStart, listEnd, innerNode);
        editor.view.dispatch(tr);

        // Select the blockquote
        setTimeout(() => {
          const { selection } = editor.state;
          const $pos = selection.$anchor;
          for (let depth = $pos.depth; depth > 0; depth--) {
            const node = $pos.node(depth);
            if (node.type.name === "blockquote") {
              setSelectedNode(node);
              break;
            }
          }
        }, 0);

        return;
      }

      // List is not inside a blockquote - wrap it in a new blockquote
      const blockquoteNode = editor.state.schema.nodes.blockquote.create(
        { id: `node-${uuidv4()}` },
        innerNode
      );

      // Replace list with blockquote
      const tr = editor.state.tr.replaceWith(listStart, listEnd, blockquoteNode);
      editor.view.dispatch(tr);

      // Select the new blockquote
      setTimeout(() => {
        const { selection } = editor.state;
        const $pos = selection.$anchor;
        for (let depth = $pos.depth; depth > 0; depth--) {
          const node = $pos.node(depth);
          if (node.type.name === "blockquote") {
            setSelectedNode(node);
            break;
          }
        }
      }, 0);

      return;
    }

    const isActive = editor.isActive("blockquote");
    const chain = editor.chain().focus().toggleBlockquote();
    const success = chain.run();

    if (success) {
      const { selection } = editor.state;
      const $pos = selection.$anchor;

      if (!isActive) {
        // Converting to blockquote - find the parent blockquote node and ensure it has an ID
        for (let depth = $pos.depth; depth > 0; depth--) {
          const node = $pos.node(depth);
          if (node.type.name === "blockquote") {
            // If the blockquote doesn't have an ID, assign one
            if (!node.attrs.id) {
              const blockquotePos = $pos.before(depth);
              const newId = `node-${uuidv4()}`;
              const tr = editor.state.tr;
              tr.setNodeMarkup(blockquotePos, undefined, { ...node.attrs, id: newId });
              editor.view.dispatch(tr);

              // Get the updated node with the new ID
              const updatedNode = editor.state.doc.nodeAt(blockquotePos);
              if (updatedNode) {
                setSelectedNode(updatedNode);
              }
            } else {
              setSelectedNode(node);
            }
            break;
          }
        }
      } else {
        // Converting from blockquote - select the inner node (paragraph/heading)
        const currentNode = $pos.node();
        if (currentNode.type.name === "paragraph" || currentNode.type.name === "heading") {
          setSelectedNode(currentNode);
        }
      }
    }
  }, [editor, setSelectedNode]);

  const onOrderedList = useCallback(() => {
    const wasInOrderedList = editor.isActive("list", { listType: "ordered" });
    const wasInUnorderedList = editor.isActive("list", { listType: "unordered" });

    // Capture current selection before toggle
    const selectionPos = editor.state.selection.from;

    if (wasInOrderedList) {
      // Already in ordered list - do nothing (stay ordered)
      return;
    }

    if (wasInUnorderedList) {
      // Switch from unordered to ordered
      editor.view.focus();
      editor.commands.setTextSelection(selectionPos);

      // Update the list type attribute
      const success = editor.commands.updateAttributes("list", { listType: "ordered" });

      if (success) {
        // Use setTimeout to ensure setSelectedNode happens AFTER any other handlers
        setTimeout(() => {
          editor.commands.setTextSelection(selectionPos);
          const { selection } = editor.state;
          const $pos = selection.$anchor;
          for (let depth = $pos.depth; depth > 0; depth--) {
            const node = $pos.node(depth);
            if (node.type.name === "list") {
              setSelectedNode(node);
              break;
            }
          }
        }, 0);
      }
    }
    // If not in a list, do nothing (can't convert text to list)
  }, [editor, setSelectedNode]);

  const onUnorderedList = useCallback(() => {
    const wasInUnorderedList = editor.isActive("list", { listType: "unordered" });
    const wasInOrderedList = editor.isActive("list", { listType: "ordered" });

    // Capture current selection before toggle
    const selectionPos = editor.state.selection.from;

    if (wasInUnorderedList) {
      // Already in unordered list - do nothing (stay unordered)
      return;
    }

    if (wasInOrderedList) {
      // Switch from ordered to unordered
      editor.view.focus();
      editor.commands.setTextSelection(selectionPos);

      // Update the list type attribute
      const success = editor.commands.updateAttributes("list", { listType: "unordered" });

      if (success) {
        // Use setTimeout to ensure setSelectedNode happens AFTER any other handlers
        setTimeout(() => {
          editor.commands.setTextSelection(selectionPos);
          const { selection } = editor.state;
          const $pos = selection.$anchor;
          for (let depth = $pos.depth; depth > 0; depth--) {
            const node = $pos.node(depth);
            if (node.type.name === "list") {
              setSelectedNode(node);
              break;
            }
          }
        }, 0);
      }
    }
    // If not in a list, do nothing (can't convert text to list)
  }, [editor, setSelectedNode]);

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
    onOrderedList,
    onUnorderedList,
    resetButtonFormatting,
  };
};
