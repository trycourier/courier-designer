import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { cn } from "@/lib/utils";
import { EditorProvider } from "@tiptap/react";
import { ExpandIcon, HamburgerMenuIcon, InboxIcon, MoreMenuIcon } from "../../../ui-kit/Icon";
import type { InboxRenderProps } from "./Inbox";
import { InboxConfig, InboxEditorContent, defaultInboxContent } from "./Inbox";
import { ReadOnlyEditorContent } from "../../ReadOnlyEditorContent";

export interface InboxEditorProps extends InboxRenderProps {
  readOnly?: boolean;
}

export const InboxEditor = ({
  content,
  extensions,
  editable,
  autofocus,
  onUpdate,
  readOnly = false,
}: InboxEditorProps) => {
  if (!content) {
    return null;
  }

  const editModeProps = readOnly
    ? { editable: false, autofocus: false }
    : {
        editable,
        autofocus,
        onUpdate,
      };

  return (
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
        {...editModeProps}
        editorContainerProps={{
          className: cn("courier-inbox-editor"),
        }}
        immediatelyRender={false}
      >
        {readOnly ? (
          <ReadOnlyEditorContent value={content} defaultValue={defaultInboxContent} />
        ) : (
          <>
            <InboxEditorContent value={content} />
            <BubbleTextMenu config={InboxConfig} />
          </>
        )}
      </EditorProvider>
    </div>
  );
};
