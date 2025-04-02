import { Editor as TiptapEditor } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { defaultButtonProps } from "../extensions/Button/Button";
import { defaultDividerProps, defaultSpacerProps } from "../extensions/Divider/Divider";
import { defaultImageProps } from "../extensions/ImageBlock/ImageBlock";
import { defaultTextBlockProps } from "../extensions/TextBlock";

// Helper function to find a node position by its ID
export const findNodePositionById = (editor: TiptapEditor, id: string): number | null => {
  let foundPos: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.id === id) {
      foundPos = pos;
      return false; // Stop traversal
    }
    return true; // Continue traversal
  });

  return foundPos;
};

// Helper function to create a new node or duplicate an existing one
export const createOrDuplicateNode = (
  editor: TiptapEditor,
  nodeType: string,
  insertPos: number,
  sourceNodeAttrs?: Record<string, any>,
  setSelectedNode?: (node: any) => void,
  sourceNodeContent?: any
): string => {
  // Generate a new unique ID
  const id = `node-${uuidv4()}`;

  // Define node creation functions with default props
  const nodeTypes: Record<string, () => any> = {
    heading: () => {
      const node = editor.schema.nodes.heading.create(
        {
          ...defaultTextBlockProps,
          ...sourceNodeAttrs,
          id,
        },
        sourceNodeContent
      );
      return node;
    },
    paragraph: () => {
      const node = editor.schema.nodes.paragraph.create(
        {
          ...defaultTextBlockProps,
          ...sourceNodeAttrs,
          id,
        },
        sourceNodeContent
      );
      return node;
    },
    text: () => {
      const node = editor.schema.nodes.paragraph.create(
        {
          ...defaultTextBlockProps,
          ...sourceNodeAttrs,
          id,
        },
        sourceNodeContent
      );
      return node;
    },
    spacer: () => {
      const node = editor.schema.nodes.divider.create({
        ...defaultSpacerProps,
        ...sourceNodeAttrs,
        id,
      });
      return node;
    },
    divider: () => {
      const node = editor.schema.nodes.divider.create({
        ...defaultDividerProps,
        ...sourceNodeAttrs,
        id,
      });
      return node;
    },
    button: () => {
      const node = editor.schema.nodes.button.create(
        {
          ...defaultButtonProps,
          ...sourceNodeAttrs,
          id,
        },
        sourceNodeContent
      );
      return node;
    },
    imageBlock: () => {
      const node = editor.schema.nodes.imageBlock.create({
        ...defaultImageProps,
        ...sourceNodeAttrs,
        id,
      });
      return node;
    },
    image: () => {
      // Fallback for image nodes (in case the type is 'image' instead of 'imageBlock')
      const node = editor.schema.nodes.imageBlock.create({
        ...defaultImageProps,
        ...sourceNodeAttrs,
        id,
      });
      return node;
    },
  };

  // Create the node
  const createNode = nodeTypes[nodeType];
  if (createNode) {
    try {
      // Create and insert the node
      const tr = editor.state.tr;
      const newNode = createNode();

      tr.insert(insertPos, newNode);
      editor.view.dispatch(tr);

      // Set selected node if callback provided
      if (setSelectedNode) {
        setSelectedNode(newNode);
      }

      // Focus on the newly created node if it's a text or heading
      if (nodeType === "text" || nodeType === "paragraph" || nodeType === "heading") {
        setTimeout(() => {
          // Find the node in the document by its ID
          const nodePos = findNodePositionById(editor, id);

          if (nodePos !== null) {
            // For text nodes, place cursor at the beginning of the node content
            editor.commands.setTextSelection(nodePos + 1);
          }
          editor.view.focus();
        }, 50);
      }

      // Dispatch a custom event to notify about the new node
      const customEvent = new CustomEvent("node-duplicated", {
        detail: { newNodeId: id },
      });
      document.dispatchEvent(customEvent);
    } catch (error) {
      console.error("Error creating node:", error);
    }
  } else {
    // Fallback for node types not explicitly defined
    try {
      // Check if the node type exists in the schema
      if (editor.schema.nodes[nodeType]) {
        const tr = editor.state.tr;
        const newNode = editor.schema.nodes[nodeType].create(
          {
            ...sourceNodeAttrs,
            id,
          },
          sourceNodeContent
        );

        tr.insert(insertPos, newNode);
        editor.view.dispatch(tr);

        // Set selected node if callback provided
        if (setSelectedNode) {
          setSelectedNode(newNode);
        }

        // Dispatch a custom event to notify about the new node
        const customEvent = new CustomEvent("node-duplicated", {
          detail: { newNodeId: id },
        });
        document.dispatchEvent(customEvent);
      } else {
        console.error(`Cannot duplicate node: type "${nodeType}" not found in schema`);
      }
    } catch (error) {
      console.error("Error creating fallback node:", error);
    }
  }

  return id;
};
