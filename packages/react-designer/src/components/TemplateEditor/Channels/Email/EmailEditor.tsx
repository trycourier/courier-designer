import { ExtensionKit } from "@/components/extensions/extension-kit";
import { isTemplateLoadingAtom, templateDataAtom } from "@/components/Providers/store";
import {
  emailEditorAtom,
  subjectAtom,
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
} from "@/components/TemplateEditor/store";
import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { selectedNodeAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
// import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib";
import {
  convertTiptapToElemental,
  updateElemental,
  createTitleUpdate,
  extractCurrentTitle,
} from "@/lib";
import type { ElementalNode, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";

declare global {
  interface Window {
    editor: Editor | null;
  }
}

export interface EmailEditorProps {
  value?: TiptapDoc;
  readOnly?: boolean;
  subject?: string | null;
  variables?: Record<string, unknown>;
  onDestroy?: () => void;
  onUpdate?: (editor: Editor) => void;
}

// Custom components that use useCurrentEditor
// const FloatingMenuWrapper = ({ children }: { children: React.ReactNode }) => {
//   const { editor } = useCurrentEditor();
//   // return <FloatingMenu editor={editor}>{children}</FloatingMenu>;
//   return <FloatingMenu editor={editor}>{editor && <TextMenu editor={editor} />}</FloatingMenu>;
// };

// const BubbleMenuWrapper = ({ children }: { children: React.ReactNode }) => {
//   const { editor } = useCurrentEditor();
//   return <BubbleMenu editor={editor}>{children}</BubbleMenu>;
// };

const EditorContent = ({ value }: { value?: TiptapDoc }) => {
  const { editor } = useCurrentEditor();
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const subject = useAtomValue(subjectAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setEmailEditor = useSetAtom(emailEditorAtom);
  const mountedRef = useRef(false);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const templateData = useAtomValue(templateDataAtom);
  const isValueUpdated = useRef(false);
  const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);

  useEffect(() => {
    if (isTemplateLoading) {
      isValueUpdated.current = false;
    }
  }, [isTemplateLoading]);

  useEffect(() => {
    if (!editor || isTemplateLoading !== false || isValueUpdated.current) {
      return;
    }

    // Use default value if value is not provided
    const contentValue = value || { type: "doc", content: [{ type: "paragraph" }] };

    setEmailEditor(editor);

    isValueUpdated.current = true;

    editor.commands.setContent(contentValue);
  }, [editor, value, setEmailEditor, isTemplateLoading]);

  useEffect(() => {
    if (!(editor && subject !== null) || isTemplateLoading !== false || isTemplateTransitioning) {
      return;
    }

    // Don't update template content if user is actively typing to preserve cursor position
    if (editor.isFocused) {
      return;
    }

    const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

    // Add null check to prevent test failures
    if (!elemental || !Array.isArray(elemental)) {
      return;
    }

    // Extract existing subject from templateEditorContent if current subject is empty
    let subjectToUse = subject;
    if (!subject && templateEditorContent) {
      const emailChannel = templateEditorContent.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "email" } =>
          el.type === "channel" && el.channel === "email"
      );

      if (emailChannel) {
        subjectToUse = extractCurrentTitle(emailChannel, "email");
      }
    }

    // Preserve the original storage format (raw.subject vs meta.title)
    const titleUpdate = createTitleUpdate(
      templateEditorContent,
      "email",
      subjectToUse || "",
      elemental
    );

    const newEmailContent = {
      elements: titleUpdate.elements,
      channel: "email",
      ...(titleUpdate.raw && { raw: titleUpdate.raw }),
    };

    const newContent = updateElemental(templateEditorContent, newEmailContent);

    if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
      setTemplateEditorContent(newContent);
    }
  }, [
    templateData,
    editor,
    subject,
    setTemplateEditorContent,
    isTemplateLoading,
    templateEditorContent,
    isTemplateTransitioning,
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
  value,
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
  const emailEditor = useAtomValue(emailEditorAtom);
  const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);

  // Store current values in refs to avoid stale closure issues
  const templateContentRef = useRef(templateEditorContent);
  const subjectRef = useRef(subject);

  // Update refs when values change
  useEffect(() => {
    templateContentRef.current = templateEditorContent;
  }, [templateEditorContent]);

  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

  useEffect(() => {
    emailEditor?.setEditable(!readOnly);
  }, [readOnly, emailEditor]);

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
      // Set window.editor for global access
      window.editor = editor;
      if (setSelectedNode) {
        setTimeout(() => {
          setSelectedNode(null);
        }, 100);
      }
    },
    [setSelectedNode, onUpdate]
  );

  // Add debounced update to prevent race conditions
  const debouncedUpdateRef = useRef<NodeJS.Timeout>();
  const pendingUpdateRef = useRef<{ editor: Editor; elemental: ElementalNode[] } | null>(null);

  const processUpdate = useCallback(
    (editor: Editor, elemental: ElementalNode[]) => {
      // Skip content updates during template transitions
      if (isTemplateTransitioning) {
        return;
      }

      // Get fresh values from refs to avoid stale closure values
      const currentTemplateContent = templateContentRef.current;
      const currentSubject = subjectRef.current;

      // Handle new templates by creating initial structure
      if (!currentTemplateContent) {
        const newContent = {
          version: "2022-01-01" as const,
          elements: [
            {
              type: "channel" as const,
              channel: "email" as const,
              elements: elemental,
            },
          ],
        };
        setTemplateEditorContent(newContent);
        return;
      }

      const emailContent = currentTemplateContent.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "email" } =>
          el.type === "channel" && el.channel === "email"
      );

      const oldEmailContent = { ...emailContent };
      oldEmailContent.elements = oldEmailContent.elements?.filter((el) => el.type !== "meta");

      const newEmailContent = {
        type: "channel",
        channel: "email",
        elements: elemental,
      };

      const contentChanged = JSON.stringify(oldEmailContent) !== JSON.stringify(newEmailContent);

      if (contentChanged) {
        // Extract existing subject from templateEditorContent if current subject is empty
        let subjectToUse = currentSubject;
        if (!currentSubject && emailContent) {
          subjectToUse = extractCurrentTitle(emailContent, "email");
        }

        // Preserve the original storage format (raw.subject vs meta.title)
        const titleUpdate = createTitleUpdate(
          currentTemplateContent,
          "email",
          subjectToUse || "",
          elemental
        );

        (newEmailContent as any).elements = titleUpdate.elements;
        if (titleUpdate.raw) {
          (newEmailContent as any).raw = titleUpdate.raw;
        }

        const newContent = updateElemental(currentTemplateContent, newEmailContent);
        setTemplateEditorContent(newContent);
      }

      onUpdate?.(editor);
      // Set window.editor for global access
      window.editor = editor;
    },
    [setTemplateEditorContent, onUpdate, isTemplateTransitioning]
  );

  const onUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

      // Store the pending update
      pendingUpdateRef.current = { editor, elemental };

      // Clear any existing timeout
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current);
      }

      // Debounce the update by 200ms to prevent race conditions
      debouncedUpdateRef.current = setTimeout(() => {
        if (pendingUpdateRef.current) {
          const { editor: pendingEditor, elemental: pendingElemental } = pendingUpdateRef.current;
          processUpdate(pendingEditor, pendingElemental);
          pendingUpdateRef.current = null;
        }
      }, 200);
    },
    [processUpdate]
  );

  const onSelectionUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      const { selection } = editor.state;
      const { $anchor } = selection;

      // Handle link and paragraph selection
      const marks = selection.$head.marks();
      const linkMark = marks.find((m) => m.type.name === "link");

      if (linkMark || editor.isActive("link")) {
        setPendingLink({ mark: linkMark });
      } else {
        setPendingLink(null);
      }

      // Update selectedNode when cursor moves between text blocks
      let depth = $anchor.depth;
      let currentNode = null;

      // Find the current paragraph or heading node
      while (depth > 0) {
        const node = $anchor.node(depth);
        if (node.type.name === "paragraph" || node.type.name === "heading") {
          currentNode = node;
          break;
        }
        depth--;
      }

      // Update selectedNode if we found a text block
      if (currentNode) {
        setSelectedNode(currentNode);
      }
    },
    [setPendingLink, setSelectedNode]
  );

  const onTransactionHandler = useCallback(
    ({ editor, transaction }: { editor: Editor; transaction: Transaction }) => {
      const showLinkForm = transaction?.getMeta("showLinkForm");
      if (showLinkForm) {
        const { selection } = editor.state;
        const marks = selection.$head.marks();
        const linkMark = marks.find((m) => m.type.name === "link");
        setPendingLink({
          mark: linkMark,
          link: {
            from: showLinkForm.from,
            to: showLinkForm.to,
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

    // Clear debounced update timeout
    if (debouncedUpdateRef.current) {
      clearTimeout(debouncedUpdateRef.current);
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

  // Provide a default value if none is provided
  const defaultValue = value || { type: "doc", content: [{ type: "paragraph" }] };

  return (
    <EditorProvider
      content={defaultValue}
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
      data-testid="editor-provider"
      immediatelyRender={false}
    >
      <EditorContent value={defaultValue} />
      <BubbleTextMenu />
      {/* <FloatingMenuWrapper>This is the floating menu</FloatingMenuWrapper> */}
      {/* <BubbleMenuWrapper>This is the bubble menu</BubbleMenuWrapper> */}
    </EditorProvider>
  );
};

export default EmailEditor;
