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
}: SMSEditorProps) => (
  <IPhoneFrame>
    <div className={cn("courier-sms-editor", className)}>
      <EditorProvider
        content={content}
        extensions={extensions}
        editable={editable}
        autofocus={autofocus}
        onUpdate={onUpdate}
        // editorContainerProps={{
        //   className: cn(
        //     "courier-sms-editor"
        //     // readOnly && "courier-brand-editor-readonly"
        //   ),
        // }}
        immediatelyRender={false}
      >
        <SMSEditorContent />
        <BubbleTextMenu config={SMSConfig} />
      </EditorProvider>
    </div>
  </IPhoneFrame>
);
