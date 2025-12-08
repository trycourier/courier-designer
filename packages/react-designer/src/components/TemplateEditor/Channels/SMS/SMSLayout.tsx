import type { SMSProps } from "./SMS";
import { SMS } from "./SMS";
import { SMSEditor } from "./SMSEditor";
import { useAtomValue } from "jotai";
import { templateEditorContentAtom } from "../../store";

export interface SMSLayoutProps extends SMSProps {}

export const SMSLayout = ({
  hidePublish,
  theme,
  variables,
  channels,
  routing,
  colorScheme,
  ...rest
}: SMSLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);

  return (
    <SMS
      value={templateEditorContent}
      variables={variables}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      colorScheme={colorScheme}
      render={(props) => (
        <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
          <SMSEditor {...props} />
        </div>
      )}
      {...rest}
    />
  );
};
