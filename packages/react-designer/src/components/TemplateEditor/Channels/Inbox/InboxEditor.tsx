import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import { ExpandIcon, HamburgerMenuIcon, InboxIcon, MoreMenuIcon } from "../../../ui-kit/Icon";
import type { InboxRenderProps } from "./Inbox";
import { InboxConfig, InboxEditorContent } from "./Inbox";

export interface InboxEditorProps extends InboxRenderProps {}

export const InboxEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
}: InboxEditorProps) => (
  <div
    className="courier-py-2 courier-border courier-w-[360px] courier-h-[500px] courier-rounded-3xl courier-bg-background"
    style={{
      maskImage: "linear-gradient(180deg, #000 80%, transparent)",
      WebkitMaskImage: "linear-gradient(180deg, #000 80%, transparent)",
    }}
  >
    <div className="courier-my-3 courier-mx-4 courier-flex courier-items-center courier-gap-2 courier-justify-between">
      <div className="courier-flex courier-items-center courier-gap-3">
        <InboxIcon />
        <span className="courier-text-xl courier-font-medium">Inbox</span>
      </div>

      <div className="courier-flex courier-items-center courier-gap-4">
        <HamburgerMenuIcon />
        <ExpandIcon />
        <MoreMenuIcon />
      </div>
    </div>
    <EditorProvider
      content={content}
      extensions={extensions}
      editable={editable}
      autofocus={autofocus}
      onUpdate={onUpdate}
      editorContainerProps={{
        className: cn(
          "courier-inbox-editor"
          // readOnly && "courier-brand-editor-readonly"
        ),
      }}
      immediatelyRender={false}
    >
      <InboxEditorContent value={content} />
      <BubbleTextMenu config={InboxConfig} />
    </EditorProvider>
  </div>
);
