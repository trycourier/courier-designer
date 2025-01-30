import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode, Mark } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { useEditor } from "@tiptap/react";
import type { Doc as YDoc } from "yjs";
import { ExtensionKit } from "./extensions/extension-kit";
import { Node } from "@tiptap/pm/model";
import { useSetAtom } from "jotai";
import { setPendingLinkAtom } from "./components/TextMenu/store";

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
  setSelectedNode?: (node: Node) => void;
  selectedNode?: Node | null;
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
  setSelectedNode,
}: UseBlockEditorProps) => {
  const setPendingLink = useSetAtom(setPendingLinkAtom);

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
        ctx.editor.commands.blur()
      },
      onUpdate: ({ editor }) => {
        onUpdate?.(convertTiptapToElemental(editor.getJSON() as TiptapDoc));
      },
      onSelectionUpdate: ({ editor }) => {
        const { selection } = editor.state;
        // Handle link and paragraph selection
        const marks = selection.$head.marks();
        const linkMark = marks.find(m => m.type.name === 'link');

        if (linkMark || editor.isActive('link')) {
          setPendingLink({ mark: linkMark });
        } else {
          setPendingLink(null);
        }
      },
      onTransaction: ({ editor, transaction }) => {
        const showLinkForm = transaction?.getMeta('showLinkForm');
        if (showLinkForm) {
          const { selection } = editor.state;
          const marks = selection.$head.marks();
          const linkMark = marks.find(m => m.type.name === 'link');
          setPendingLink({
            mark: linkMark,
            link: {
              from: selection.from,
              to: selection.to
            }
          });
        }
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
      extensions: [
        ...ExtensionKit({ imageBlockPlaceholder, variables, setSelectedNode }),
        EscapeHandlerExtension,
      ].filter((e): e is AnyExtension => e !== undefined),
    },
    [ydoc]
  );

  window.editor = editor;

  return { editor };
};
