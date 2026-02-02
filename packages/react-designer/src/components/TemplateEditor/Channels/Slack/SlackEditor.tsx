import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import type { SlackRenderProps } from "./Slack";
import { SlackEditorContent, defaultSlackContent } from "./Slack";
import { SlackFrame } from "./SlackFrame";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useRef, useEffect, useCallback } from "react";
import { type VariableViewMode } from "../../store";
import { VariableViewModeSync } from "../../VariableViewModeSync";
import { setVariableViewMode } from "@/components/extensions/Variable";
import { useSetAtom } from "jotai";
import { setSelectedNodeAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { getFormUpdating } from "../../store";

export interface SlackEditorProps extends SlackRenderProps {
  readOnly?: boolean;
  variableViewMode?: VariableViewMode;
}

export const SlackEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  readOnly = false,
  variableViewMode = "show-variables",
  textMenuConfig,
}: SlackEditorProps) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const setPendingLink = useSetAtom(setPendingLinkAtom);

  const handleCreate = useCallback(
    ({ editor }: { editor: Editor }) => {
      setVariableViewMode(editor, variableViewMode);
    },
    [variableViewMode]
  );

  const handleSelectionUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      // Skip selection updates during form-initiated edits to preserve sidebar form state
      if (getFormUpdating()) {
        return;
      }

      const { selection } = editor.state;
      const { $anchor } = selection;

      // Handle link selection
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

  const handleTransaction = useCallback(
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

  useEffect(() => {
    const element = editorContainerRef.current;
    if (!element || readOnly) return;

    return dropTargetForElements({
      element,
      getData: () => ({
        type: "editor",
        id: "editor-drop-zone",
      }),
    });
  }, [readOnly]);

  if (!content) {
    return null;
  }

  return (
    <SlackFrame>
      <div ref={editorContainerRef}>
        <EditorProvider
          content={content}
          extensions={extensions}
          editable={editable}
          autofocus={autofocus}
          onUpdate={onUpdate}
          onCreate={handleCreate}
          onSelectionUpdate={handleSelectionUpdate}
          onTransaction={handleTransaction}
          editorContainerProps={{
            className: cn("courier-slack-editor"),
          }}
          immediatelyRender={false}
        >
          <VariableViewModeSync variableViewMode={variableViewMode} />
          {readOnly ? (
            <ReadOnlyEditorContent value={content} defaultValue={defaultSlackContent} />
          ) : (
            <>
              <SlackEditorContent value={content} />
              <BubbleTextMenu config={textMenuConfig} />
            </>
          )}
        </EditorProvider>
      </div>
    </SlackFrame>
  );
};
