import { convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { useEditor } from "@tiptap/react";
import type { Doc as YDoc } from "yjs";
import { ExtensionKit } from "./extensions/extension-kit";

declare global {
  interface Window {
    editor: Editor | null;
  }
}

interface UseBlockEditorProps {
  initialContent?: ElementalContent;
  ydoc: YDoc;
  onUpdate?: (content: ElementalContent) => void;
  onElementSelect?: (node?: ProseMirrorNode) => void;
  imageBlockPlaceholder?: string;
}

export const useBlockEditor = ({
  initialContent,
  ydoc,
  onUpdate,
  onElementSelect,
  imageBlockPlaceholder,
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

        if (
          ["button", "spacer", "paragraph", "imageBlock"].includes(
            selectedNode?.type.name
          )
        ) {
          onElementSelect(selectedNode);
          return;
        }
        onElementSelect(undefined);
      },
      onUpdate: ({ editor }) => {
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
          console.warn("Invalid drop data");
          return;
        }

        if (!["button", "spacer", "image", "variable"].includes(data.content)) {
          return;
        }

        if (!editor?.view) {
          console.warn("Editor view not available");
          return;
        }

        const view = editor.view;
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        if (!pos) {
          if (data.content === "button") {
            editor.commands.setButton({ label: "New Button" });
          } else if (data.content === "spacer") {
            editor.commands.setSpacer({});
          } else if (data.content === "image") {
            editor.commands.setImageBlock({});
          } else if (data.content === "variable") {
            editor.commands.insertContent("{{");
          }
          return;
        }

        // Get the resolved position
        const $pos = view.state.doc.resolve(pos.pos);

        // Insert at the current position
        if (data.content === "button") {
          editor
            .chain()
            .focus()
            .insertContentAt($pos.pos, {
              type: "button",
              attrs: { label: "New Button" },
            })
            .run();
        } else if (data.content === "spacer") {
          editor
            .chain()
            .focus()
            .insertContentAt($pos.pos, {
              type: "spacer",
            })
            .run();
        } else if (data.content === "image") {
          editor
            .chain()
            .focus()
            .insertContentAt($pos.pos, {
              type: "imageBlock",
            })
            .command(({ tr }) => {
              const lastNode = tr.doc.lastChild;
              if (lastNode?.type.name === "imageBlock") {
                const pos = tr.doc.content.size;
                tr.insert(pos, editor.schema.nodes.paragraph.create());
                tr.setSelection(TextSelection.create(tr.doc, pos + 1));
              }
              return true;
            })
            .run();
        } else if (data.content === "variable") {
          editor.chain().focus().insertContentAt($pos.pos, "{{").run();
        }
      },
      extensions: [...ExtensionKit({ imageBlockPlaceholder })].filter(
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
