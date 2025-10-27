import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EditorProvider } from "@tiptap/react";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import type { SlackRenderProps } from "./Slack";
import { SlackConfig, SlackEditorContent, defaultSlackContent } from "./Slack";
import { SlackFrame } from "./SlackFrame";

export interface SlackEditorProps extends SlackRenderProps {
  readOnly?: boolean;
}

export const SlackEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  items,
  readOnly = false,
}: SlackEditorProps) => {
  const { setNodeRef } = useDroppable({
    id: "Editor",
  });

  if (!content) {
    return null;
  }

  return (
    <SlackFrame>
      <div ref={setNodeRef}>
        <SortableContext items={items.Editor} strategy={verticalListSortingStrategy}>
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
        </SortableContext>
      </div>
    </SlackFrame>
  );
};
