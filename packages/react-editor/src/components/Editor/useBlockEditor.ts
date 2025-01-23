import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode, Mark } from "@tiptap/pm/model";
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
  onSelectionChange?: (info: {
    node: ProseMirrorNode;
    mark?: Mark;
    pendingLink?: { from: number; to: number };
  } | undefined) => void;
  imageBlockPlaceholder?: string;
  variables?: Record<string, any>;
}

export const useBlockEditor = ({
  initialContent = {
    "version": "2022-01-01",
    "elements": [
      {
        "type": "text",
        "align": "left",
        "content": "\n"
      }
    ]
  },
  ydoc,
  onUpdate,
  onElementSelect,
  onSelectionChange,
  imageBlockPlaceholder,
  variables,
}: UseBlockEditorProps) => {
  // Create an extension to handle the Escape key
  const EscapeHandlerExtension = Extension.create({
    name: 'escapeHandler',
    addKeyboardShortcuts() {
      return {
        'Escape': ({ editor }) => {
          const { state, dispatch } = editor.view;
          dispatch(state.tr.setSelection(TextSelection.create(state.doc, state.selection.$anchor.pos)));
          onElementSelect?.(undefined);
          onSelectionChange?.(undefined);
          return false;
        },
      }
    },
  });

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      autofocus: true,
      onCreate: (ctx) => {
        if (ctx.editor.isEmpty && initialContent) {
          ctx.editor.commands.setContent(convertElementalToTiptap(initialContent));
          ctx.editor.commands.focus("start", { scrollIntoView: true });
        }
      },
      onSelectionUpdate: ({ editor, transaction }) => {
        const { selection } = editor.state;

        // Handle regular node selection first
        if (onElementSelect) {
          const selectedNode =
            selection instanceof NodeSelection
              ? selection.node
              : selection.$anchor.parent;

          if (
            ["button", "divider", "paragraph", "heading", "imageBlock", "blockquote"].includes(
              selectedNode?.type.name
            )
          ) {
            // if (selectedNode.type.name === 'paragraph') {
            //   editor.chain().focus().select(true).run();
            // }
            onElementSelect(selectedNode);
          } else {
            onElementSelect(undefined);
          }
        }

        // Handle link and paragraph selection
        const node = selection.$head.parent;
        const marks = selection.$head.marks();
        const linkMark = marks.find(m => m.type.name === 'link');
        const showLinkForm = transaction?.getMeta('showLinkForm');

        if (showLinkForm) {
          onSelectionChange?.({
            node,
            pendingLink: showLinkForm
          });
        } else if (linkMark || editor.isActive('link')) {
          onSelectionChange?.({ node, mark: linkMark });
        } else if (selection instanceof NodeSelection && ["button", "divider", "imageBlock"].includes(selection.node.type.name)) {
          onSelectionChange?.({ node: selection.node });
        } else if (node.type.name === 'paragraph' && (Object.keys(node.attrs).length > 0 || editor.isActive('paragraph'))) {
          onSelectionChange?.({ node });
        } else if (node.type.name === 'heading' && (Object.keys(node.attrs).length > 0 || editor.isActive('heading'))) {
          onSelectionChange?.({ node });
        } else {
          onSelectionChange?.(undefined);
        }
      },
      onTransaction: ({ editor, transaction }) => {
        const { selection } = editor.state;

        // Handle link and paragraph selection
        const node = selection.$head.parent;
        const marks = selection.$head.marks();
        const linkMark = marks.find(m => m.type.name === 'link');
        const showLinkForm = transaction?.getMeta('showLinkForm');

        if (showLinkForm) {
          onSelectionChange?.({
            node,
            pendingLink: showLinkForm
          });
        } else if (linkMark || editor.isActive('link')) {
          onSelectionChange?.({ node, mark: linkMark });
        }
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

        if (!["button", "divider", "image", "variable", "paragraph", "heading"].includes(data.content)) {
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
          } else if (data.content === "divider") {
            editor.commands.setDivider({});
          } else if (data.content === "image") {
            editor.commands.setImageBlock({});
          } else if (data.content === "variable") {
            editor.commands.insertContent("{{");
          } else if (data.content === "paragraph" || data.content === "heading") {
            editor
              .chain()
              .focus()
              .insertContent({
                type: data.content,
              })
              .run();
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
        } else if (data.content === "divider") {
          editor
            .chain()
            .focus()
            .insertContentAt($pos.pos, {
              type: "divider",
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
        } else if (data.content === "paragraph" || data.content === "heading") {
          editor
            .chain()
            .focus()
            .insertContentAt($pos.pos, {
              type: data.content,
            })
            .run();
        }
      },
      editorProps: {
        attributes: {
          autocomplete: "off",
          autocorrect: "off",
          autocapitalize: "off",
          class: "min-h-full",
        },
      },
      extensions: [
        ...ExtensionKit({ imageBlockPlaceholder, variables }),
        EscapeHandlerExtension,
      ].filter((e): e is AnyExtension => e !== undefined),
    },
    [ydoc]
  );

  window.editor = editor;

  return { editor };
};
