import { isTemplateLoadingAtom, templateDataAtom } from "@/components/Providers/store";
import {
  isTemplateTransitioningAtom,
  subjectAtom,
  templateEditorAtom,
  templateEditorContentAtom,
  isDraggingAtom,
  flushFunctionsAtom,
  pendingAutoSaveAtom,
  type VariableViewMode,
  getFormUpdating,
} from "@/components/TemplateEditor/store";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { selectedNodeAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import {
  convertElementalToTiptap,
  convertTiptapToElemental,
  createTitleUpdate,
  extractCurrentTitle,
  updateElemental,
} from "@/lib";
import { setTestEditor } from "@/lib/testHelpers";
import type { ElementalNode, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { defaultEmailContent } from "./Email";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { VariableViewModeSync } from "../../VariableViewModeSync";
import { setVariableViewMode } from "@/components/extensions/Variable/variable-storage.utils";

export interface EmailEditorProps {
  value?: TiptapDoc;
  readOnly?: boolean;
  subject?: string | null;
  variables?: Record<string, unknown>;
  disableVariablesAutocomplete?: boolean;
  variableViewMode?: VariableViewMode;
  onDestroy?: () => void;
  onUpdate?: (editor: Editor) => void;
}

// Module-level flag to track when content is being restored
// This prevents selection updates from clearing the selected node during restoration
let isRestoringContent = false;

// Module-level flag to track when the content change originated from the editor's onUpdate
// This prevents the restoration effect from running when changes came from internal edits
let isInternalContentUpdate = false;
let isInternalContentUpdateTimeout: NodeJS.Timeout | null = null;

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
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const subject = useAtomValue(subjectAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setTemplateEditor = useSetAtom(templateEditorAtom);
  const setFlushFunctions = useSetAtom(flushFunctionsAtom);
  const mountedRef = useRef(false);
  const subjectUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const templateData = useAtomValue(templateDataAtom);
  const isValueUpdated = useRef(false);
  const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);

  useEffect(() => {
    if (isTemplateLoading) {
      isValueUpdated.current = false;
    }
  }, [isTemplateLoading]);

  // Register flush function for subject updates
  useEffect(() => {
    const flushSubjectUpdate = () => {
      // If there's a pending timeout, clear it and execute immediately
      if (subjectUpdateTimeoutRef.current) {
        clearTimeout(subjectUpdateTimeoutRef.current);
        subjectUpdateTimeoutRef.current = undefined;

        // Execute the update logic immediately
        if (editor && isTemplateLoading === false && !isTemplateTransitioning) {
          try {
            const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

            if (!elemental || !Array.isArray(elemental)) {
              return;
            }

            // Only fallback to existing subject if subject is null, not empty string
            let subjectToUse = subject;
            if (subject === null && templateEditorContent) {
              const emailChannel = templateEditorContent?.elements?.find(
                (el): el is ElementalNode & { type: "channel"; channel: "email" } =>
                  el.type === "channel" && el.channel === "email"
              );

              if (emailChannel) {
                subjectToUse = extractCurrentTitle(emailChannel, "email");
              }
            }

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
              setPendingAutoSave(newContent);
            }
          } catch (error) {
            console.error("[FlushSubjectUpdate]", error);
          }
        }
      }
    };

    // Register the flush function
    setFlushFunctions({ action: "register", id: "email-subject", fn: flushSubjectUpdate });

    return () => {
      // Unregister on unmount
      setFlushFunctions({ action: "unregister", id: "email-subject" });
    };
  }, [
    editor,
    subject,
    isTemplateLoading,
    isTemplateTransitioning,
    templateEditorContent,
    setTemplateEditorContent,
    setPendingAutoSave,
    setFlushFunctions,
  ]);

  useEffect(() => {
    if (!editor || isTemplateLoading !== false || isValueUpdated.current || !value) {
      return;
    }

    setTemplateEditor(editor);

    isValueUpdated.current = true;
    editor.commands.setContent(value);
  }, [editor, value, setTemplateEditor, isTemplateLoading]);

  // Restoration effect: Update editor content when templateEditorContent changes externally
  useEffect(() => {
    if (!editor || !templateEditorContent) return;

    // Don't update content if user is actively typing to preserve cursor position
    if (editor.isFocused) return;

    // Don't update content if a sidebar form is actively updating the editor
    // This prevents the restoration from replacing nodes while the form is editing them
    if (getFormUpdating()) {
      return;
    }

    // Don't update content if the change originated from the editor's onUpdate handler
    // This prevents unnecessary content replacement when changes came from internal edits
    if (isInternalContentUpdate) {
      return;
    }

    // Don't update content if user is focused on a sidebar form input
    // This prevents the restoration from replacing nodes while the user is typing in the sidebar
    const activeElement = document.activeElement;
    const isSidebarFormFocused = activeElement?.closest("[data-sidebar-form]") !== null;
    if (isSidebarFormFocused) {
      return;
    }

    // Get email channel from templateEditorContent
    const emailChannel = templateEditorContent.elements?.find(
      (el): el is ElementalNode & { type: "channel"; channel: "email" } =>
        el.type === "channel" && el.channel === "email"
    );

    if (!emailChannel) return;

    // Get elements from email channel
    const emailElements: ElementalNode[] =
      (emailChannel.type === "channel" && "elements" in emailChannel && emailChannel.elements) ||
      [];

    // Convert to TipTap format
    const newContent = convertElementalToTiptap({
      version: "2022-01-01",
      elements: [
        {
          type: "channel" as const,
          channel: "email" as const,
          elements: emailElements,
        },
      ],
    });

    const incomingContent = convertTiptapToElemental(newContent);
    const currentContent = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

    // Only update if content has actually changed to avoid infinite loops
    if (JSON.stringify(incomingContent) !== JSON.stringify(currentContent)) {
      setTimeout(() => {
        // Re-check all conditions inside timeout since they may have changed
        const activeEl = document.activeElement;
        const sidebarFocused = activeEl?.closest("[data-sidebar-form]") !== null;
        if (
          !editor.isFocused &&
          !getFormUpdating() &&
          !isInternalContentUpdate &&
          !sidebarFocused
        ) {
          // Mark that we're restoring content to prevent selection handler from clearing selectedNode
          isRestoringContent = true;
          editor.commands.setContent(newContent);
          // Reset the flag after a short delay to allow selection update to be skipped
          setTimeout(() => {
            isRestoringContent = false;
          }, 50);
        }
      }, 1);
    }
  }, [editor, templateEditorContent]);

  useEffect(() => {
    if (!editor || isTemplateLoading !== false || isTemplateTransitioning) {
      return;
    }

    // Don't update template content if user is actively typing to preserve cursor position
    if (editor.isFocused) {
      return;
    }

    // Clear any existing timeout to debounce subject updates
    if (subjectUpdateTimeoutRef.current) {
      clearTimeout(subjectUpdateTimeoutRef.current);
    }

    // Debounce subject updates by 500ms to prevent rapid templateEditorContent updates
    // while user is typing in the Subject field
    subjectUpdateTimeoutRef.current = setTimeout(() => {
      try {
        const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

        // Add null check to prevent test failures
        if (!elemental || !Array.isArray(elemental)) {
          return;
        }

        // Extract existing subject from templateEditorContent only if subject is null/undefined
        // An empty string "" is a valid intentional value and should trigger a save
        let subjectToUse = subject;
        if (subject === null && templateEditorContent) {
          const emailChannel = templateEditorContent?.elements?.find(
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
          setPendingAutoSave(newContent);
        }
      } catch (error) {
        console.error(error);
      }
    }, 500);

    // Cleanup function
    return () => {
      if (subjectUpdateTimeoutRef.current) {
        clearTimeout(subjectUpdateTimeoutRef.current);
      }
    };
  }, [
    templateData,
    editor,
    subject,
    setTemplateEditorContent,
    setPendingAutoSave,
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
  onDestroy,
  onUpdate,
  subject: propSubject,
  variables,
  disableVariablesAutocomplete = false,
  variableViewMode = "show-variables",
}: EmailEditorProps) => {
  const setPendingLink = useSetAtom(setPendingLinkAtom);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const subjectFromAtom = useAtomValue(subjectAtom);
  const subject = propSubject ?? subjectFromAtom;
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const templateEditor = useAtomValue(templateEditorAtom);
  const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
  const isDragging = useAtomValue(isDraggingAtom);
  const setFlushFunctions = useSetAtom(flushFunctionsAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);

  // Store current values in refs to avoid stale closure issues
  const templateContentRef = useRef(templateEditorContent);
  const subjectRef = useRef(subject);
  const isDraggingRef = useRef(isDragging);

  // Update refs when values change
  useEffect(() => {
    templateContentRef.current = templateEditorContent;
  }, [templateEditorContent]);

  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    templateEditor?.setEditable(!readOnly);
  }, [readOnly, templateEditor]);

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
      setVariableViewMode(editor, variableViewMode);
      onUpdate?.(editor);
      setTestEditor("email", editor);
      if (setSelectedNode) {
        setTimeout(() => {
          setSelectedNode(null);
        }, 100);
      }
    },
    [setSelectedNode, onUpdate, variableViewMode]
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
        setPendingAutoSave(newContent);
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newEmailContent as any).elements = titleUpdate.elements;
        if (titleUpdate.raw) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newEmailContent as any).raw = titleUpdate.raw;
        }

        const newContent = updateElemental(currentTemplateContent, newEmailContent);
        // Mark this as an internal update so the restoration effect doesn't run
        isInternalContentUpdate = true;
        setTemplateEditorContent(newContent);
        setPendingAutoSave(newContent);
        // Clear any existing timeout and reset - this ensures the flag stays true
        // for 300ms after the LAST update, not the first
        if (isInternalContentUpdateTimeout) {
          clearTimeout(isInternalContentUpdateTimeout);
        }
        isInternalContentUpdateTimeout = setTimeout(() => {
          isInternalContentUpdate = false;
          isInternalContentUpdateTimeout = null;
        }, 300);
      }

      onUpdate?.(editor);
      // Set editor for test access
      setTestEditor("email", editor);
    },
    [setTemplateEditorContent, setPendingAutoSave, onUpdate, isTemplateTransitioning]
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
      // Skip selection updates during drag operations
      if (isDraggingRef.current) {
        return;
      }

      // Skip selection updates during content restoration to preserve sidebar form state
      if (isRestoringContent) {
        return;
      }

      // Skip selection updates during form-initiated edits to preserve sidebar form state
      if (getFormUpdating()) {
        return;
      }

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
      let blockquoteNode = null;
      let listNode = null;

      // Find the current paragraph or heading node, and check if inside a blockquote or list
      while (depth > 0) {
        const node = $anchor.node(depth);
        if (!blockquoteNode && node.type.name === "blockquote") {
          blockquoteNode = node;
        }
        if (!listNode && node.type.name === "list") {
          listNode = node;
        }
        if (!currentNode && (node.type.name === "paragraph" || node.type.name === "heading")) {
          currentNode = node;
        }
        depth--;
      }

      // Priority: list > blockquote > text block
      // If inside a list, select the list instead of the inner text block
      if (listNode) {
        setSelectedNode(listNode);
      } else if (blockquoteNode) {
        // If inside a blockquote (but not in a list), select the blockquote
        setSelectedNode(blockquoteNode);
      } else if (currentNode) {
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

    // Clear editor on destroy
    setTestEditor("email", null);
  }, [onDestroy]);

  // Register flush function for content updates
  useEffect(() => {
    const flushContentUpdate = () => {
      // If there's a pending timeout, clear it and execute immediately
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current);
        debouncedUpdateRef.current = undefined;

        // Execute the pending update immediately
        if (pendingUpdateRef.current) {
          const { editor: pendingEditor, elemental: pendingElemental } = pendingUpdateRef.current;
          processUpdate(pendingEditor, pendingElemental);
          pendingUpdateRef.current = null;
        }
      }
    };

    // Register the flush function
    setFlushFunctions({ action: "register", id: "email-content", fn: flushContentUpdate });

    return () => {
      // Unregister on unmount
      setFlushFunctions({ action: "unregister", id: "email-content" });
    };
  }, [processUpdate, setFlushFunctions]);

  const handleEditorClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Skip clicks during drag operations
      if (isDraggingRef.current) {
        return;
      }

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

  const shouldHandleClick = useCallback(() => {
    return !isDraggingRef.current;
  }, []);

  const extensions = useMemo(
    () =>
      [
        ...ExtensionKit({
          setSelectedNode,
          shouldHandleClick,
          variables,
          disableVariablesAutocomplete,
        }),
        EscapeHandlerExtension,
      ].filter((e): e is AnyExtension => e !== undefined),
    [
      EscapeHandlerExtension,
      setSelectedNode,
      shouldHandleClick,
      variables,
      disableVariablesAutocomplete,
    ]
  );

  // Provide a default value if none is provided
  const defaultValue = value || {
    type: "doc",
    content: [{ type: "paragraph" }],
  };

  const editModeProps = readOnly
    ? { editable: false, autofocus: false }
    : {
        editable: true,
        autofocus: true,
        onCreate: onCreateHandler,
        onUpdate: onUpdateHandler,
        onSelectionUpdate: onSelectionUpdateHandler,
        onTransaction: onTransactionHandler,
      };

  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Setup drop zone for the entire editor area
  // This acts as a fallback when not dropping on a specific element
  useEffect(() => {
    const element = editorContainerRef.current;
    if (!element || readOnly) return;

    return dropTargetForElements({
      element,
      getData: () => ({
        type: "editor",
        id: "editor-drop-zone",
      }),
      // Only act as drop target when no child drop targets are available
      // This allows individual elements to be the primary drop targets
      canDrop: ({ source }) => {
        // Always allow sidebar items to be dropped on the editor
        if (source.data.type === "sidebar") {
          return true;
        }
        // For editor items, this zone acts as a fallback
        return source.data.type === "editor";
      },
    });
  }, [readOnly]);

  return (
    <div ref={editorContainerRef} data-testid="email-editor">
      <EditorProvider
        content={defaultValue}
        extensions={extensions}
        {...editModeProps}
        onDestroy={onDestroyHandler}
        editorContainerProps={{
          onClick: handleEditorClick,
        }}
        immediatelyRender={false}
      >
        <VariableViewModeSync variableViewMode={variableViewMode} />
        {readOnly ? (
          <ReadOnlyEditorContent value={defaultValue} defaultValue={defaultEmailContent} />
        ) : (
          <>
            <EditorContent value={defaultValue} />
            <BubbleTextMenu />
          </>
        )}

        {/* <FloatingMenuWrapper>This is the floating menu</FloatingMenuWrapper> */}
        {/* <BubbleMenuWrapper>This is the bubble menu</BubbleMenuWrapper> */}
      </EditorProvider>
    </div>
  );
};

export default EmailEditor;
