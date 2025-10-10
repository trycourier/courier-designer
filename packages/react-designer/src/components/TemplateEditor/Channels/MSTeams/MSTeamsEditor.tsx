import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { MSTeamsRenderProps } from "./MSTeams";
import { MSTeamsConfig, MSTeamsEditorContent } from "./MSTeams";
import { MSTeamsFrame } from "./MSTeamsFrame";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

export interface MSTeamsEditorProps extends MSTeamsRenderProps {}

export const MSTeamsEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  items,
}: MSTeamsEditorProps) => {
  const { setNodeRef } = useDroppable({
    id: "Editor",
  });

  if (!content) {
    return null;
  }

  return (
    <MSTeamsFrame>
      <div ref={setNodeRef}>
        <SortableContext items={items.Editor} strategy={verticalListSortingStrategy}>
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
            <MSTeamsEditorContent value={content} />
            <BubbleTextMenu config={MSTeamsConfig} />
          </EditorProvider>
        </SortableContext>
      </div>
    </MSTeamsFrame>
  );
};
