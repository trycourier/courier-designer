import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { useEditor } from "@tiptap/react";
import type { Doc as YDoc } from "yjs";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { Node } from "@tiptap/pm/model";
import { useAtomValue, useSetAtom } from "jotai";
import { setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { useCallback, useMemo, useRef } from "react";
import { isTemplateEditorSetAtom } from "@/components/Providers/store";

declare global {
  interface Window {
    editor: Editor | null;
  }
}

interface UseBlockEditorProps {
  initialContent?: ElementalContent;
  readOnly?: boolean;
  subject?: string | null;
  variables?: Record<string, unknown>;
  ydoc: YDoc;
  onDestroy?: () => void;
  onUpdate?: (content: ElementalContent) => void;
  setSelectedNode?: (node: Node | null) => void;
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
  readOnly = false,
  subject,
  variables,
  ydoc,
  onDestroy,
  onUpdate,
  setSelectedNode,
}: UseBlockEditorProps) => {
  const setPendingLink = useSetAtom(setPendingLinkAtom);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isTemplateEditorSet = useAtomValue(isTemplateEditorSetAtom);

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

  const onCreateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      if (setSelectedNode) {
        setTimeout(() => {
          setSelectedNode(null);
        }, 100);
      }
      // Trigger initial update to ensure subject is included
      if (onUpdate && !isTemplateEditorSet && subject !== null) {
        const content = convertTiptapToElemental(editor?.getJSON() as TiptapDoc, subject);
        onUpdate(content);
      }
    },
    [subject, isTemplateEditorSet, onUpdate, setSelectedNode]
  );

  const onUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      if (isTemplateEditorSet && subject !== null) {
        onUpdate?.(convertTiptapToElemental(editor.getJSON() as TiptapDoc, subject));
      }
    },
    [isTemplateEditorSet, subject, onUpdate]
  );

  const onSelectionUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
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
    [setPendingLink]
  );

  const onTransactionHandler = useCallback(
    ({ editor, transaction }: { editor: Editor; transaction: Transaction }) => {
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
    [setPendingLink]
  );

  const onDestroyHandler = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onDestroy?.();
  }, [onDestroy]);

  const extensions = useMemo(
    () =>
      [...ExtensionKit({ variables, setSelectedNode }), EscapeHandlerExtension].filter(
        (e): e is AnyExtension => e !== undefined
      ),
    [EscapeHandlerExtension, variables, setSelectedNode]
  );

  const editor = useEditor(
    {
      content: convertElementalToTiptap(initialContent),
      immediatelyRender: true,
      shouldRerenderOnTransaction: true,
      autofocus: !readOnly,
      editable: !readOnly,
      onCreate: onCreateHandler,
      onUpdate: onUpdateHandler,
      onSelectionUpdate: onSelectionUpdateHandler,
      onTransaction: onTransactionHandler,
      onDestroy: onDestroyHandler,
      extensions,
    },
    [ydoc]
  );

  window.editor = editor;

  return { editor };
};
