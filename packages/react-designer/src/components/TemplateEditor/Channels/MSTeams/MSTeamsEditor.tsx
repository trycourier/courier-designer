import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { MSTeamsRenderProps } from "./MSTeams";
import { MSTeamsConfig, MSTeamsEditorContent, defaultMSTeamsContent } from "./MSTeams";
import { MSTeamsFrame } from "./MSTeamsFrame";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";

export interface MSTeamsEditorProps extends MSTeamsRenderProps {
  readOnly?: boolean;
}

export const MSTeamsEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  items,
  readOnly = false,
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
            {readOnly ? (
              <ReadOnlyEditorContent value={content} defaultValue={defaultMSTeamsContent} />
            ) : (
              <>
                <MSTeamsEditorContent value={content} />
                <BubbleTextMenu config={MSTeamsConfig} />
              </>
            )}
          </EditorProvider>
        </SortableContext>
      </div>
    </MSTeamsFrame>
  );
};
