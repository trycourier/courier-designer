import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { HTMLAttributes } from "react";
import { IPhoneFrame } from "../../IPhoneFrame";
import type { SMSRenderProps } from "./SMS";
import { SMSConfig, SMSEditorContent } from "./SMS";

export interface SMSEditorProps
  extends SMSRenderProps,
    Omit<HTMLAttributes<HTMLDivElement>, "content"> {}

export const SMSEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  className,
}: SMSEditorProps) => {
  // Provide a default value if none is provided
  const defaultContent = content || { type: "doc", content: [{ type: "paragraph" }] };

  return (
    <IPhoneFrame>
      <div className={cn("courier-sms-editor", className)}>
        <EditorProvider
          content={defaultContent}
          extensions={extensions}
          editable={editable}
          autofocus={autofocus}
          onUpdate={onUpdate}
          data-testid="editor-provider"
          immediatelyRender={false}
        >
          <SMSEditorContent value={defaultContent} />
          <BubbleTextMenu config={SMSConfig} />
        </EditorProvider>
      </div>
    </IPhoneFrame>
  );
};
