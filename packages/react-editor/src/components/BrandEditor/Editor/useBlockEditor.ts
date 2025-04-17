import { BrandEditorContentAtom } from "@/components/BrandEditor/store";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { useEditor } from "@tiptap/react";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useMemo, useRef } from "react";
import type { Doc as YDoc } from "yjs";

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
  onUpdate?: () => void;
  setSelectedNode?: (node: Node | null) => void;
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
  readOnly = false,
  variables,
  ydoc,
  onDestroy,
  setSelectedNode,
}: UseBlockEditorProps) => {
  const setPendingLink = useSetAtom(setPendingLinkAtom);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [brandEditorContent, setBrandEditorContent] = useAtom(BrandEditorContentAtom);

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

  const onCreateHandler = useCallback(() => {
    if (setSelectedNode) {
      setTimeout(() => {
        setSelectedNode(null);
      }, 100);
    }
  }, [setSelectedNode]);

  const onUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      const newContent = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
      if (JSON.stringify(brandEditorContent) !== JSON.stringify(newContent)) {
        setBrandEditorContent(newContent);
      }
    },
    [brandEditorContent, setBrandEditorContent]
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
