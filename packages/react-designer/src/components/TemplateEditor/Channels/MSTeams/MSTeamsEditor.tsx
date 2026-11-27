import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import type { MSTeamsRenderProps } from "./MSTeams";
import { MSTeamsEditorContent, defaultMSTeamsContent } from "./MSTeams";
import { MSTeamsFrame } from "./MSTeamsFrame";
import { MSTeamsButtonOverflow } from "./MSTeamsButtonOverflow";
import { resolveTeamsButtonDrop } from "./teamsButtonDrop";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  currentSourceId,
  draggedBlockLabel,
  setLastTrailingTarget,
} from "@/components/extensions/DropRules";
import { useRef, useEffect, useCallback, useState } from "react";
import { useMSTeamsFormat } from "./msteamsFormat";
import { type VariableViewMode } from "../../store";
import { VariableViewModeSync } from "../../VariableViewModeSync";
import { setVariableViewMode } from "@/components/extensions/Variable";
import { useSetAtom } from "jotai";
import { setSelectedNodeAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { getFormUpdating } from "../../store";

export interface MSTeamsEditorProps extends MSTeamsRenderProps {
  readOnly?: boolean;
  variableViewMode?: VariableViewMode;
}

export const MSTeamsEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  readOnly = false,
  variableViewMode = "show-variables",
  textMenuConfig,
}: MSTeamsEditorProps) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const editorRef = useRef<Editor | null>(null);
  const { format } = useMSTeamsFormat();
  // Set while a button is dragged over the message outside the button row: it will end the row.
  const [trailingDrop, setTrailingDrop] = useState<string | null>(null);
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const setPendingLink = useSetAtom(setPendingLinkAtom);

  const handleCreate = useCallback(
    ({ editor }: { editor: Editor }) => {
      editorRef.current = editor;
      setVariableViewMode(editor, variableViewMode);
      setTimeout(() => {
        isInitialMountRef.current = false;
      }, 100);
    },
    [variableViewMode]
  );

  const handleSelectionUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      // Skip the selection update triggered by autofocus on initial mount
      if (isInitialMountRef.current) {
        return;
      }

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

    // Only an Adaptive card has a button row to end.
    const isCard = format === "adaptive_card";
    const isButton = (dragType: unknown) => String(dragType ?? "").split(":")[0] === "button";

    const updateTrailingDrop = ({
      source,
      location,
    }: {
      source: { data: Record<string, unknown> };
      location: {
        current: {
          dropTargets: { element: Element; data: Record<string | symbol, unknown> }[];
          input: { clientX: number; clientY: number };
        };
      };
    }) => {
      const { dragType, type } = source.data as { dragType?: string; type?: string };
      const editor = editorRef.current;
      const id = currentSourceId(editor, source.data);
      if (!isCard || !isButton(dragType) || !editor || editor.isDestroyed) {
        setTrailingDrop(null);
        return;
      }
      // The "…" menu places the drop itself.
      const overMenu = location.current.dropTargets[0]?.data.insertPos !== undefined;
      const { clientX, clientY } = location.current.input;
      const name = draggedBlockLabel(editor, source.data);
      const resolved = overMenu
        ? null
        : resolveTeamsButtonDrop(editor, { x: clientX, y: clientY }, id);
      setLastTrailingTarget(
        resolved ? { ...resolved, dragType: dragType ?? null, label: name } : null
      );
      // Off the button rows, a new button from the sidebar ends the row; one being moved stays.
      setTrailingDrop(!resolved && !overMenu && type === "sidebar" ? (dragType ?? null) : null);
    };
    const endDrag = () => {
      setTrailingDrop(null);
      setLastTrailingTarget(null);
    };

    return dropTargetForElements({
      element,
      getData: () => ({
        type: "editor",
        id: "editor-drop-zone",
      }),
      onDragEnter: updateTrailingDrop,
      onDrag: updateTrailingDrop,
      onDragLeave: endDrag,
      onDrop: () => setTrailingDrop(null),
    });
  }, [readOnly, format]);

  if (!content) {
    return null;
  }

  return (
    <MSTeamsFrame format={format}>
      <div
        ref={editorContainerRef}
        className="courier-relative"
        data-msteams-editor-root=""
        data-trailing-drop={trailingDrop ?? undefined}
      >
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
            className: cn("courier-msteams-editor"),
          }}
          immediatelyRender={false}
        >
          <VariableViewModeSync variableViewMode={variableViewMode} />
          {readOnly ? (
            <ReadOnlyEditorContent value={content} defaultValue={defaultMSTeamsContent} />
          ) : (
            <>
              <MSTeamsEditorContent value={content} />
              <BubbleTextMenu config={textMenuConfig} />
            </>
          )}
          {format === "adaptive_card" && (
            <MSTeamsButtonOverflow
              containerRef={editorContainerRef}
              // A host can pass `editable: false` without `readOnly` (the built-in layout
              // does). Not `editor.isEditable`: a drag turns that off while it runs.
              readOnly={readOnly || !editable}
            />
          )}
        </EditorProvider>
      </div>
    </MSTeamsFrame>
  );
};
