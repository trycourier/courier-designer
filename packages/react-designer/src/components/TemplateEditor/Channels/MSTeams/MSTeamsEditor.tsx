import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { MSTeamsRenderProps } from "./MSTeams";
import { MSTeamsConfig, MSTeamsEditorContent, defaultMSTeamsContent } from "./MSTeams";
import { MSTeamsFrame } from "./MSTeamsFrame";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useRef, useEffect, useCallback } from "react";
import { type VariableViewMode } from "../../store";
import { VariableViewModeSync } from "../../VariableViewModeSync";
import { setVariableViewMode } from "@/components/extensions/Variable";

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
}: MSTeamsEditorProps) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const handleCreate = useCallback(
    ({ editor }: { editor: Editor }) => {
      setVariableViewMode(editor, variableViewMode);
    },
    [variableViewMode]
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
    <MSTeamsFrame>
      <div ref={editorContainerRef}>
        <EditorProvider
          content={content}
          extensions={extensions}
          editable={editable}
          autofocus={autofocus}
          onUpdate={onUpdate}
          onCreate={handleCreate}
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
              <BubbleTextMenu config={MSTeamsConfig} />
            </>
          )}
        </EditorProvider>
      </div>
    </MSTeamsFrame>
  );
};
