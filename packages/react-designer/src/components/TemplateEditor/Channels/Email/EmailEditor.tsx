import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
// import { FloatingMenu, BubbleMenu, useCurrentEditor } from "@tiptap/react";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import {
  subjectAtom,
  templateEditorContentAtom,
  emailEditorAtom,
} from "@/components/TemplateEditor/store";
import { selectedNodeAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { isTenantLoadingAtom, tenantDataAtom } from "@/components/Providers/store";

declare global {
  interface Window {
    editor: Editor | null;
  }
}

interface EmailEditorProps {
  value?: ElementalContent;
  readOnly?: boolean;
  subject?: string | null;
  variables?: Record<string, unknown>;
  onDestroy?: () => void;
  onUpdate?: (editor: Editor) => void;
}

// Custom components that use useCurrentEditor
// const FloatingMenuWrapper = ({ children }: { children: React.ReactNode }) => {
//   const { editor } = useCurrentEditor();
//   return <FloatingMenu editor={editor}>{children}</FloatingMenu>;
// };

// const BubbleMenuWrapper = ({ children }: { children: React.ReactNode }) => {
//   const { editor } = useCurrentEditor();
//   return <BubbleMenu editor={editor}>{children}</BubbleMenu>;
// };

const EditorContent = () => {
  const { editor } = useCurrentEditor();
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const subject = useAtomValue(subjectAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setEmailEditor = useSetAtom(emailEditorAtom);
  const mountedRef = useRef(false);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const tenantData = useAtomValue(tenantDataAtom);

  useEffect(() => {
    if (editor) {
      setEmailEditor(editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setEmailEditor]);

  useEffect(() => {
    if (!(editor && subject !== null) || isTenantLoading !== false) {
      return;
    }
    const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
    const newContent = updateElemental(templateEditorContent, {
      elements: elemental,
      channel: "email",
      meta: {
        subject,
      },
    });
    if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
      setTemplateEditorContent(newContent);
    }
  }, [
    tenantData,
    editor,
    subject,
    setTemplateEditorContent,
    isTenantLoading,
    templateEditorContent,
  ]);

  // Ensure editor is editable when component unmounts or editor changes
  useEffect(() => {
    return () => {
      // Reset editor to editable state when component unmounts
      if (editor && !editor.isDestroyed) {
        editor.setEditable(true);
      }
    };
  }, [editor]);

  useEffect(() => {
    if (editor && mountedRef.current) {
      editor.commands.updateSelectionState(selectedNode);
    }
  }, [editor, selectedNode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return null;
};

const EmailEditor = ({
  value = {
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
  variables,
  onDestroy,
  onUpdate,
  subject: propSubject,
}: EmailEditorProps) => {
  const setPendingLink = useSetAtom(setPendingLinkAtom);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const subjectFromAtom = useAtomValue(subjectAtom);
  const subject = propSubject ?? subjectFromAtom;
  const setSelectedNode = useSetAtom(selectedNodeAtom);

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
      onUpdate?.(editor);
      if (setSelectedNode) {
        setTimeout(() => {
          setSelectedNode(null);
        }, 100);
      }
    },
    [setSelectedNode, onUpdate]
  );

  const onUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      if (!templateEditorContent) {
        return;
      }
      const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
      const newContent = updateElemental(templateEditorContent, {
        elements: elemental,
        channel: "email",
        meta: {
          subject,
        },
      });
      if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
        setTemplateEditorContent(newContent);
      }
      onUpdate?.(editor);

      // Set window.editor for global access
      // window.editor = editor;
    },
    [templateEditorContent, subject, setTemplateEditorContent, onUpdate]
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

    // Clear window.editor on destroy
    window.editor = null;
  }, [onDestroy]);

  const handleEditorClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // @ts-ignore
      const editor = event.view?.editor;

      // if (!editor || !mountedRef.current || !editor.isEditable) {
      if (!editor || !editor.isEditable) {
        return;
      }

      const target = event.target as HTMLElement;
      const targetPos = editor.view.posAtDOM(target, 0);
      const targetNode = editor.state.doc.resolve(targetPos).node();

      if (targetNode.type.name === "paragraph") {
        setSelectedNode(targetNode);
      }
    },
    [setSelectedNode]
  );

  const extensions = useMemo(
    () =>
      [...ExtensionKit({ variables, setSelectedNode }), EscapeHandlerExtension].filter(
        (e): e is AnyExtension => e !== undefined
      ),
    [EscapeHandlerExtension, variables, setSelectedNode]
  );

  return (
    <EditorProvider
      content={convertElementalToTiptap(value, { channel: "email" })}
      extensions={extensions}
      editable={!readOnly}
      autofocus={!readOnly}
      onCreate={onCreateHandler}
      onUpdate={onUpdateHandler}
      onSelectionUpdate={onSelectionUpdateHandler}
      onTransaction={onTransactionHandler}
      onDestroy={onDestroyHandler}
      editorContainerProps={{
        onClick: handleEditorClick,
      }}
    >
      <EditorContent />
      {/* <FloatingMenuWrapper>This is the floating menu</FloatingMenuWrapper> */}
      {/* <BubbleMenuWrapper>This is the bubble menu</BubbleMenuWrapper> */}
    </EditorProvider>
  );
};

export default EmailEditor;
