import type { InboxProps } from "./Inbox";
import { Inbox } from "./Inbox";
import { InboxEditor } from "./InboxEditor";
import { SideBar } from "./SideBar";
import { useAtomValue } from "jotai";
import { templateEditorContentAtom } from "../../store";

export interface InboxLayoutProps extends InboxProps {}

export const InboxLayout = ({
  hidePublish,
  theme,
  variables,
  channels,
  routing,
}: InboxLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);

  return (
    <Inbox
      value={templateEditorContent}
      variables={variables}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      render={(props) => (
        <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
          <div className="courier-flex courier-flex-col courier-flex-1 courier-py-8 courier-items-center">
            <InboxEditor {...props} />
          </div>
          <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
            <div className="courier-p-4 courier-h-full">
              <SideBar />
            </div>
          </div>
        </div>
      )}
    />
  );
};
