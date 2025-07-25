import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import type { HTMLAttributes } from "react";
import { IPhoneFrame } from "../../IPhoneFrame";
import { PushConfig, PushEditorContent, type PushRenderProps } from "./Push";

export interface PushEditorProps
  extends PushRenderProps,
    Omit<HTMLAttributes<HTMLDivElement>, "content"> {}

export const PushEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  className,
}: PushEditorProps) => (
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
      content={content}
      extensions={extensions}
      editable={editable}
      autofocus={autofocus}
      onUpdate={onUpdate}
      editorContainerProps={{
        className: cn(
          "courier-push-editor"
          // readOnly && "courier-brand-editor-readonly"
        ),
      }}
      immediatelyRender={false}
    >
      <PushEditorContent />
      <BubbleTextMenu config={PushConfig} />
    </EditorProvider>
  </IPhoneFrame>
);
