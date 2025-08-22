import type { PushProps } from "./Push";
import { Push } from "./Push";
import { PushEditor } from "./PushEditor";
import { useAtomValue } from "jotai";
import { templateDataAtom } from "@/components/Providers/store";

export interface PushLayoutProps extends PushProps {}

export const PushLayout = ({
  hidePublish,
  theme,
  variables,
  channels,
  routing,
}: PushLayoutProps) => {
  const templateData = useAtomValue(templateDataAtom);

  return (
    <Push
      value={templateData?.data?.tenant?.notification?.data?.content}
      variables={variables}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      render={(props) => (
        <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
          <PushEditor {...props} />
        </div>
      )}
    />
  );
};
