import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import type { SlackRenderProps } from "./Slack";
import { SlackConfig, SlackEditorContent, defaultSlackContent } from "./Slack";
import { SlackFrame } from "./SlackFrame";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useRef, useEffect } from "react";

export interface SlackEditorProps extends SlackRenderProps {
  readOnly?: boolean;
}

export const SlackEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  readOnly = false,
}: SlackEditorProps) => {
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
    <SlackFrame>
      <div ref={editorContainerRef}>
        <EditorProvider
          content={content}
          extensions={extensions}
          editable={editable}
          autofocus={autofocus}
          onUpdate={onUpdate}
          editorContainerProps={{
            className: cn("courier-slack-editor"),
          }}
          immediatelyRender={false}
        >
          {readOnly ? (
            <ReadOnlyEditorContent value={content} defaultValue={defaultSlackContent} />
          ) : (
            <>
              <SlackEditorContent value={content} />
              <BubbleTextMenu config={SlackConfig} />
            </>
          )}
        </EditorProvider>
      </div>
    </SlackFrame>
  );
};
