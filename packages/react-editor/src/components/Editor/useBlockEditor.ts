import type { AnyExtension, Editor } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import type { Doc as YDoc } from "yjs";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { convertTiptapToElemental } from "@/lib";
import { ElementalContent, TiptapDoc } from "@/types";
import { ExtensionKit } from "./extensions/extension-kit";
import { NodeSelection } from "@tiptap/pm/state";

declare global {
  interface Window {
    editor: Editor | null;
  }
}

type UseBlockEditorProps = {
  initialContent?: ElementalContent;
  ydoc: YDoc;
  onUpdate?: (content: ElementalContent) => void;
  onElementSelect?: (node?: ProseMirrorNode) => void;
};

export const useBlockEditor = ({
  initialContent,
  ydoc,
  onUpdate,
  onElementSelect,
}: UseBlockEditorProps) => {
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      autofocus: true,
      onCreate: (ctx) => {
        if (ctx.editor.isEmpty && initialContent) {
          ctx.editor.commands.setContent(initialContent);
          ctx.editor.commands.focus("start", { scrollIntoView: true });
        }
      },
      onSelectionUpdate: ({ editor }) => {
        if (!onElementSelect) {
          return;
        }
        const selection = editor.state.selection;
        const selectedNode =
          selection instanceof NodeSelection
            ? selection.node
            : selection.$anchor.parent;

        if (selectedNode?.type.name === "button") {
          onElementSelect(selectedNode);
          return;
        }
        onElementSelect(undefined);
      },
      onUpdate: ({ editor }) => {
        // console.log("onUpdate", JSON.stringify(editor.getJSON(), null, 2));
        onUpdate?.(convertTiptapToElemental(editor.getJSON() as TiptapDoc));
      },
      onDrop: (event) => {
        event.preventDefault();

        let data;
        try {
          data = JSON.parse(
            event.dataTransfer?.getData("application/json") || "{}"
          );
        } catch (error) {
          // console.error("Error parsing dropped data", error);
        }

        if (data.content !== "button" && data.content !== "spacer") {
          return;
        }

        if (!editor?.view) {
          console.warn("Editor view not available");
          return;
        }

        const view = editor.view;
        const editorDOM = view.dom;
        const dropY = event.clientY;
        const blocks = Array.from(editorDOM.children);

        // Find the nearest block based on vertical position
        let targetBlock = null;
        let minDistance = Infinity;
        let insertBefore = true;

        blocks.forEach((block) => {
          const rect = block.getBoundingClientRect();
          const blockMiddle = (rect.top + rect.bottom) / 2;
          const distance = Math.abs(dropY - blockMiddle);

          if (distance < minDistance) {
            minDistance = distance;
            targetBlock = block;
            insertBefore = dropY < blockMiddle;
          }
        });

        if (!targetBlock) {
          // If no blocks found, append at the end
          if (data.content === "button") {
            editor.chain().focus().setButton({ label: "New Button" }).run();
          }
          if (data.content === "spacer") {
            editor.chain().focus().setHorizontalRule().run();
          }
          return;
        }

        // Get the position of the target block
        const targetPos = view.posAtDOM(targetBlock, 0);
        if (!targetPos) {
          console.warn("Could not determine block position");
          return;
        }

        // Insert either before or after the target block
        const resolvedPos = view.state.doc.resolve(targetPos);

        // Check if there's a spacer before
        if (
          data.content === "spacer" &&
          resolvedPos.nodeBefore?.type.name === "horizontalRule"
        ) {
          const insertPos = resolvedPos.before();
          editor
            .chain()
            .focus()
            .insertContentAt(insertPos, { type: "horizontalRule" })
            .run();
          return;
        }

        const insertPos = insertBefore
          ? resolvedPos.before()
          : resolvedPos.after();

        const newContent =
          data.content === "button"
            ? {
                type: "button",
                content: [{ type: "text", text: "New Button" }],
              }
            : { type: "horizontalRule" };

        // Insert the component
        editor.chain().focus().insertContentAt(insertPos, newContent).run();
      },
      extensions: [...ExtensionKit()].filter(
        (e): e is AnyExtension => e !== undefined
      ),
      editorProps: {
        attributes: {
          autocomplete: "off",
          autocorrect: "off",
          autocapitalize: "off",
          class: "min-h-full",
        },
      },
    },
    [ydoc]
  );

  window.editor = editor;

  return { editor };
};
