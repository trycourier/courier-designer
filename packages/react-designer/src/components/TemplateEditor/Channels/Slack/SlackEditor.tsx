import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { SlackRenderProps } from "./Slack";
import { SlackConfig, SlackEditorContent } from "./Slack";
import { SlackFrame } from "./SlackFrame";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

export interface SlackEditorProps extends SlackRenderProps {}

export const SlackEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  items,
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
            <SlackEditorContent value={content} />
            <BubbleTextMenu config={SlackConfig} />
          </EditorProvider>
        </SortableContext>
      </div>
    </SlackFrame>
  );
};
