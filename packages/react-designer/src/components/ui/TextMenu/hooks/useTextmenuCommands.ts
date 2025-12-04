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
