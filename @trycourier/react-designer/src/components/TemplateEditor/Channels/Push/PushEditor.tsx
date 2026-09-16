import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { HTMLAttributes } from "react";
import { useCallback } from "react";
import { IPhoneFrame } from "../../IPhoneFrame";
import { PushConfig, PushEditorContent, type PushRenderProps } from "./Push";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import { defaultPushContent } from "./Push";
import { type VariableViewMode } from "../../store";
import { VariableViewModeSync } from "../../VariableViewModeSync";
import { setVariableViewMode } from "@/components/extensions/Variable";

export interface PushEditorProps
  extends PushRenderProps,
    Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  readOnly?: boolean;
  variableViewMode?: VariableViewMode;
}

export const PushEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  className,
  readOnly = false,
  variableViewMode = "show-variables",
}: PushEditorProps) => {
  const defaultContent = content || { type: "doc", content: [{ type: "paragraph" }] };

  const editModeProps = readOnly
    ? { editable: false, autofocus: false }
    : {
        editable,
        autofocus,
        onUpdate,
      };

  const handleCreate = useCallback(
    ({ editor }: { editor: Editor }) => {
      setVariableViewMode(editor, variableViewMode);
    },
    [variableViewMode]
  );

  return (
    <IPhoneFrame>
      <div
        className={cn(
          "courier-px-4 courier-py-2 courier-text-[#A3A3A3] courier-text-center courier-my-8",
          className
        )}
      >
        <p className="courier-text-lg courier-font-medium">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p className="courier-text-5xl courier-font-semibold courier-mt-1">
          {new Date().toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </p>
      </div>
      <EditorProvider
        content={defaultContent}
        extensions={extensions}
        {...editModeProps}
        onCreate={handleCreate}
        editorContainerProps={{
          className: cn("courier-push-editor"),
        }}
        data-testid="editor-provider"
        immediatelyRender={false}
      >
        <VariableViewModeSync variableViewMode={variableViewMode} />
        {readOnly ? (
          <ReadOnlyEditorContent value={defaultContent} defaultValue={defaultPushContent} />
        ) : (
          <>
            <PushEditorContent value={defaultContent} />
            <BubbleTextMenu config={PushConfig} />
          </>
        )}
      </EditorProvider>
    </IPhoneFrame>
  );
};
