import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useEditor } from "@tiptap/react";
import type { Doc as YDoc } from "yjs";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { Node } from "@tiptap/pm/model";
import { useSetAtom } from "jotai";
import { setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { useRef } from "react";

declare global {
  interface Window {
    editor: Editor | null;
  }
}

interface UseBlockEditorProps {
  initialContent?: ElementalContent;
  ydoc: YDoc;
  onUpdate?: (content: ElementalContent) => void;
  variables?: Record<string, any>;
  setSelectedNode?: (node: Node | null) => void;
  subject?: string;
  readOnly?: boolean;
}

export const useBlockEditor = ({
  initialContent = {
    version: "2022-01-01",
    elements: [
      {
        type: "text",
        align: "left",
        content: "\n",
        text_style: "h1",
      },
      {
        type: "text",
        align: "left",
        content: "",
      },
      {
        type: "image",
        src: "",
      },
    ],
  },
  ydoc,
  onUpdate,
  variables,
  setSelectedNode,
  subject,
  readOnly = false,
}: UseBlockEditorProps) => {
  const setPendingLink = useSetAtom(setPendingLinkAtom);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Create an extension to handle the Escape key
  const EscapeHandlerExtension = Extension.create({
    name: "escapeHandler",
    addKeyboardShortcuts() {
      return {
        Escape: ({ editor }) => {
          const { state, dispatch } = editor.view;
          dispatch(
            state.tr.setSelection(TextSelection.create(state.doc, state.selection.$anchor.pos))
          );
          if (setSelectedNode) {
            setSelectedNode(null);
          }
          return false;
        },
      };
    },
  });

  const editor = useEditor(
    {
      content: convertElementalToTiptap(initialContent),
      immediatelyRender: true,
      shouldRerenderOnTransaction: true,
      autofocus: !readOnly,
      editable: !readOnly,
      onCreate: () => {
        if (setSelectedNode) {
          setTimeout(() => {
            setSelectedNode(null);
          }, 100);
        }
        // Trigger initial update to ensure subject is included
        if (onUpdate) {
          const content = convertTiptapToElemental(editor?.getJSON() as TiptapDoc, subject);
          onUpdate(content);
        }
      },
      onUpdate: ({ editor }) => {
        onUpdate?.(convertTiptapToElemental(editor.getJSON() as TiptapDoc, subject));
      },
      onSelectionUpdate: ({ editor }) => {
        const { selection } = editor.state;
        // Handle link and paragraph selection
        const marks = selection.$head.marks();
        const linkMark = marks.find((m) => m.type.name === "link");

        if (linkMark || editor.isActive("link")) {
          setPendingLink({ mark: linkMark });
        } else {
          setPendingLink(null);
        }
      },
      onTransaction: ({ editor, transaction }) => {
        const { selection } = editor.state;

        const showLinkForm = transaction?.getMeta("showLinkForm");
        if (showLinkForm) {
          const marks = selection.$head.marks();
          const linkMark = marks.find((m) => m.type.name === "link");
          setPendingLink({
            mark: linkMark,
            link: {
              from: selection.from,
              to: selection.to,
            },
          });
        }
      },
      onDestroy: () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      },
      extensions: [...ExtensionKit({ variables, setSelectedNode }), EscapeHandlerExtension].filter(
        (e): e is AnyExtension => e !== undefined
      ),
    },
    [ydoc]
  );

  window.editor = editor;

  return { editor };
};
