import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { HTMLAttributes } from "react";
import { useCallback } from "react";
import { IPhoneFrame } from "../../IPhoneFrame";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";
import type { SMSRenderProps } from "./SMS";
import { SMSConfig, SMSEditorContent, defaultSMSContent } from "./SMS";
import { type VariableViewMode } from "../../store";
import { VariableViewModeSync } from "../../VariableViewModeSync";
import { setVariableViewMode } from "@/components/extensions/Variable";

export interface SMSEditorProps
  extends SMSRenderProps,
    Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  readOnly?: boolean;
  variableViewMode?: VariableViewMode;
}

export const SMSEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  className,
  readOnly = false,
  variableViewMode = "show-variables",
}: SMSEditorProps) => {
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
      <div className={cn("courier-sms-editor", className)}>
        <EditorProvider
          content={defaultContent}
          extensions={extensions}
          {...editModeProps}
          onCreate={handleCreate}
          data-testid="editor-provider"
          immediatelyRender={false}
        >
          <VariableViewModeSync variableViewMode={variableViewMode} />
          {readOnly ? (
            <ReadOnlyEditorContent value={defaultContent} defaultValue={defaultSMSContent} />
          ) : (
            <>
              <SMSEditorContent value={defaultContent} />
              <BubbleTextMenu config={SMSConfig} />
            </>
          )}
        </EditorProvider>
      </div>
    </IPhoneFrame>
  );
};
