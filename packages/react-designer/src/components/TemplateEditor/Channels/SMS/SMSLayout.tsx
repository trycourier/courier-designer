import type { SMSProps } from "./SMS";
import { SMS } from "./SMS";
import { SMSEditor } from "./SMSEditor";
import { useAtomValue } from "jotai";
import { templateDataAtom } from "@/components/Providers/store";

export interface SMSLayoutProps extends SMSProps {}

export const SMSLayout = ({ hidePublish, theme, variables, channels, routing }: SMSLayoutProps) => {
  const templateData = useAtomValue(templateDataAtom);

  return (
    <SMS
      value={templateData?.data?.tenant?.notification?.data?.content}
      variables={variables}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      render={(props) => (
        <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
          <SMSEditor {...props} />
        </div>
      )}
    />
  );
};
