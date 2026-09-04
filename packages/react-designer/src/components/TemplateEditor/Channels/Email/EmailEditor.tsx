import { isTemplateLoadingAtom, templateDataAtom } from "@/components/Providers/store";
import {
  isTemplateTransitioningAtom,
  subjectAtom,
  templateEditorAtom,
  templateEditorContentAtom,
  isDraggingAtom,
  pendingAutoSaveAtom,
  type VariableViewMode,
  emailFormattingEnabledAtom,
  previewLocaleAtom,
  // The last `getFormUpdating` call site in this file. It is a selection guard,
  // not a content guard — the content ones are gone. Retiring it (and making the
  // counter instance state) is C-20386 step 5, and wants the sidebar form path
  // converted first.
  getFormUpdating,
} from "@/components/TemplateEditor/store";
import { amendDocumentAtom, commitDocumentAtom } from "@/components/TemplateEditor/documentStore";
import {
  applyDocumentToEditor,
  canonicalizeForEditor,
  useChannelDocument,
} from "@/components/TemplateEditor/useChannelDocument";
import { useDocumentHistory } from "@/components/TemplateEditor/useDocumentHistory";
import { resolveSelectedNode } from "@/components/ui/TextMenu/resolveSelectedNode";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { LinkBubble } from "@/components/extensions/Link/LinkBubble";
import { selectedNodeAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import {
  convertTiptapToElemental,
  createTitleUpdate,
  extractCurrentTitle,
  updateElemental,
} from "@/lib";
import { setTestEditor } from "@/lib/testHelpers";
import type { ElementalContent, ElementalNode, TiptapDoc } from "@/types";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { defaultEmailContent, emailDocFromContent } from "./Email";
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

// The module-level `isRestoringContent` / `isInternalContentUpdate` flags that
// used to live here are gone with C-20386. They were two more answers to "is
// this write mine?", asked with a 300ms timer and shared by every designer
// mounted on the page. The store answers it now: see documentStore.ts.

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
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const commitDocument = useSetAtom(commitDocumentAtom);
  const amendDocument = useSetAtom(amendDocumentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const subject = useAtomValue(subjectAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setTemplateEditor = useSetAtom(templateEditorAtom);
  const previewLocale = useAtomValue(previewLocaleAtom);
  const mountedRef = useRef(false);
  /**
   * The subject as of the last time we wrote it into the document.
   *
   * This effect runs for two quite different reasons and they must not be
   * treated alike. When the SUBJECT changed, the author typed in the Subject
   * field: an edit, and it takes ownership of the document. When anything else
   * in the deps changed, it is normalisation — lifting whatever title the
   * document already carries into the storage format the rest of the code
   * expects — and if that counted as an edit, opening a template would take
   * ownership before the author had touched anything and every API response
   * after it would be dropped as stale.
   *
   * `undefined` means "not synced yet", distinct from a subject of `null`.
   */
  const lastSyncedSubjectRef = useRef<string | null | undefined>(undefined);
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
    if (!editor || isTemplateLoading !== false || isValueUpdated.current || !value) {
      return;
    }

    setTemplateEditor(editor);

    isValueUpdated.current = true;
    // Not `setContent`: seeding the editor with the document it was opened on
    // is not something the author did, and it must not sit at the bottom of
    // their undo stack. It did, which is why the first ⌘Z after a remount
    // appeared to do nothing — ProseMirror had a step to spend on it.
    applyDocumentToEditor(editor, value);
  }, [editor, value, setTemplateEditor, isTemplateLoading]);

  // The document, arriving from anywhere that is not this editor. What used to
  // be here — a focus check, `getFormUpdating()`, an `isInternalContentUpdate`
  // flag, a `[data-sidebar-form]` probe, a full deep-compare of the converted
  // document, and a `setTimeout` that re-checked all four — is in
  // useChannelDocument now, as one revision comparison.
  useChannelDocument({
    editor,
    toTiptap: (content) => emailDocFromContent(content, previewLocale),
    enabled: isTemplateLoading === false,
  });

  useEffect(() => {
    if (!editor || isTemplateLoading !== false || isTemplateTransitioning) {
      return;
    }

    // Don't update template content if user is actively typing to preserve cursor position
    if (editor.isFocused) {
      return;
    }

    // Committed as it is typed, not after 500ms. The debounce here was the
    // other half of the flush registry: autosave had to go and ask for the
    // pending subject before it could read the document (criterion 5). The
    // write is cheap and autosave is debounced on its own, so there is nothing
    // left for the delay to buy.
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

      const authorChangedSubject =
        lastSyncedSubjectRef.current !== undefined && lastSyncedSubjectRef.current !== subject;
      lastSyncedSubjectRef.current = subject;

      if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
        if (authorChangedSubject) {
          commitDocument(newContent);
          setPendingAutoSave(newContent);
        } else {
          amendDocument(newContent);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, [
    templateData,
    editor,
    subject,
    commitDocument,
    amendDocument,
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
  const store = useStore();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const commitDocument = useSetAtom(commitDocumentAtom);
  const subjectFromAtom = useAtomValue(subjectAtom);
  const subject = propSubject ?? subjectFromAtom;
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const templateEditor = useAtomValue(templateEditorAtom);
  const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
  const isDragging = useAtomValue(isDraggingAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const emailFormattingEnabled = useAtomValue(emailFormattingEnabledAtom);
  const previewLocale = useAtomValue(previewLocaleAtom);
  const amendDocument = useSetAtom(amendDocumentAtom);

  /**
   * What the stored document looks like once it has been through the editor and
   * back — the SAME document, in the editor's canonical form.
   *
   * Opening a template emits an `onUpdate` before the author has touched
   * anything: the converter fills in defaults the stored Elemental never
   * carried (paddings, transparent borders, background colours), so the
   * round-tripped document differs from the stored one and looks exactly like
   * an edit. Treating it as one would hand ownership to an author who has not
   * typed a character, and every API response after that would be dropped as
   * stale (criterion 1 turned against itself).
   *
   * Comparing against this tells the two apart without a timer or a focus
   * check: if what came out of the editor is the canonical form of what went
   * in, nobody edited anything.
   */
  const canonicalCacheRef = useRef<{ content: unknown; locale?: string; value: string } | null>(
    null
  );
  const canonicalStoredElemental = useCallback(
    (editor: Editor, content: ElementalContent | null | undefined, locale?: string) => {
      const cached = canonicalCacheRef.current;
      if (cached && cached.content === content && cached.locale === locale) {
        return cached.value;
      }
      const value = JSON.stringify(
        convertTiptapToElemental(
          canonicalizeForEditor(editor, emailDocFromContent(content, locale))
        )
      );
      canonicalCacheRef.current = { content, locale, value };
      return value;
    },
    []
  );

  // Store current values in refs to avoid stale closure issues
  const subjectRef = useRef(subject);
  const isDraggingRef = useRef(isDragging);
  const previewLocaleRef = useRef(previewLocale);
  previewLocaleRef.current = previewLocale;

  // Update refs when values change
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

  const processUpdate = useCallback(
    (editor: Editor, elemental: ElementalNode[]) => {
      // Skip content updates during template transitions
      if (isTemplateTransitioning) {
        return;
      }

      // Read the document from the store, not from a ref.
      //
      // `templateContentRef` is updated by an effect, so it lags any write made
      // in the same tick — and this handler MERGES into whatever it reads, so a
      // lagging read silently discards whatever that write did. Adding a
      // channel was the visible case: the new channel appeared and then
      // vanished, because the email editor's next update merged into the
      // pre-add document. The 200ms debounce used to hide this by giving the
      // effect time to catch up; it was never a fix.
      const currentTemplateContent = store.get(templateEditorContentAtom);
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
        commitDocument(newContent);
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

        if (
          JSON.stringify(elemental) ===
          canonicalStoredElemental(editor, currentTemplateContent, previewLocaleRef.current)
        ) {
          // The editor's canonical rendering of the document it was given.
          // Worth persisting, not worth owning. See canonicalStoredElemental.
          amendDocument(newContent);
        } else {
          commitDocument(newContent);
          setPendingAutoSave(newContent);
        }
      }

      onUpdate?.(editor);
      // Set editor for test access
      setTestEditor("email", editor);
    },
    [
      store,
      commitDocument,
      amendDocument,
      setPendingAutoSave,
      onUpdate,
      isTemplateTransitioning,
      canonicalStoredElemental,
    ]
  );

  /**
   * Email was the only channel that did not commit what the author typed until
   * 200ms later, which is why it was the only one that could lose the end of a
   * sentence to a channel switch (criterion 2): the switch unmounts the layout
   * well inside that window. The debounce was described as preventing "race
   * conditions" — the race was the restoration effect overwriting the author,
   * and that is fixed at the source now.
   *
   * It bought no work either: the expensive part, `convertTiptapToElemental`,
   * already ran on every keystroke before the timer. Only the store write was
   * deferred, and autosave has its own debounce.
   */
  const onUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      processUpdate(editor, convertTiptapToElemental(editor.getJSON() as TiptapDoc));
    },
    [processUpdate]
  );

  const onSelectionUpdateHandler = useCallback(
    ({ editor }: { editor: Editor }) => {
      // Skip selection updates during drag operations
      if (isDraggingRef.current) {
        return;
      }

      // Skip selection updates during form-initiated edits to preserve sidebar form state
      if (getFormUpdating()) {
        return;
      }

      const { selection } = editor.state;

      // Handle link and paragraph selection
      const marks = selection.$head.marks();
      const linkMark = marks.find((m) => m.type.name === "link");

      if (linkMark || editor.isActive("link")) {
        setPendingLink({ mark: linkMark });
      } else {
        setPendingLink(null);
      }

      // Same rule the re-sync path uses to re-resolve the selection against a
      // replaced document — one function, so the two cannot disagree.
      const resolved = resolveSelectedNode(editor);
      if (resolved) {
        setSelectedNode(resolved);
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

    onDestroy?.();

    // Clear editor on destroy
    setTestEditor("email", null);
  }, [onDestroy]);

  // The content flush registration that used to be here is gone: `onUpdate`
  // commits synchronously, so there is never a pending update for autosave to
  // ask about (C-20386, criterion 5).

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

  const documentHistory = useDocumentHistory({
    toTiptap: (content) => emailDocFromContent(content, previewLocale),
  });

  const extensions = useMemo(
    () =>
      [
        ...ExtensionKit({
          setSelectedNode,
          shouldHandleClick,
          variables,
          disableVariablesAutocomplete,
          // Gates the paste path too, not just the toolbar button — see
          // `FontSizeOptions.enabled`.
          fontSize: emailFormattingEnabled,
          documentHistory,
        }),
        EscapeHandlerExtension,
      ].filter((e): e is AnyExtension => e !== undefined),
    [
      EscapeHandlerExtension,
      setSelectedNode,
      shouldHandleClick,
      variables,
      disableVariablesAutocomplete,
      emailFormattingEnabled,
      documentHistory,
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
    <div ref={editorContainerRef} data-testid="email-editor" className="courier-relative">
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
            <LinkBubble />
          </>
        )}

        {/* <FloatingMenuWrapper>This is the floating menu</FloatingMenuWrapper> */}
        {/* <BubbleMenuWrapper>This is the bubble menu</BubbleMenuWrapper> */}
      </EditorProvider>
    </div>
  );
};

export default EmailEditor;
