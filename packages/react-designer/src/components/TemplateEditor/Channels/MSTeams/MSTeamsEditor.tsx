import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { MSTeamsRenderProps } from "./MSTeams";
import { MSTeamsConfig, MSTeamsEditorContent, defaultMSTeamsContent } from "./MSTeams";
import { MSTeamsFrame } from "./MSTeamsFrame";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useRef, useEffect } from "react";

export interface MSTeamsEditorProps extends MSTeamsRenderProps {
  readOnly?: boolean;
}

export const MSTeamsEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  readOnly = false,
}: MSTeamsEditorProps) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Setup drop zone for the entire editor area
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
          editorContainerProps={{
            className: cn("courier-msteams-editor"),
          }}
          immediatelyRender={false}
        >
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
