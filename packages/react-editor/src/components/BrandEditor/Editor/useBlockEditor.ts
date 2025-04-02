import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { useEditor } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { useRef } from "react";
import type { Doc as YDoc } from "yjs";
import { setPendingLinkAtom } from "../../ui/TextMenu/store";
import { ExtensionKit } from "../../extensions/extension-kit";

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
}

export const useBlockEditor = ({
  initialContent = {
    version: "2022-01-01",
    elements: [
      {
        type: "text",
        align: "left",
        content: "",
      },
    ],
  },
  ydoc,
  onUpdate,
  variables,
  setSelectedNode,
  subject,
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
      autofocus: false,
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
