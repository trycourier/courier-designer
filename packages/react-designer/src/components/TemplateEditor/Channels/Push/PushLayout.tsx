import type { PushProps } from "./Push";
import { Push } from "./Push";
import { PushEditor } from "./PushEditor";
import { useAtomValue } from "jotai";
import { templateEditorContentAtom } from "../../store";

export interface PushLayoutProps extends PushProps {}

export const PushLayout = ({
  hidePublish,
  theme,
  variables,
  disableVariablesAutocomplete,
  channels,
  routing,
  ...rest
}: PushLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);

  return (
    <Push
      value={templateEditorContent}
      variables={variables}
      disableVariablesAutocomplete={disableVariablesAutocomplete}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      render={(props) => (
        <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
          <PushEditor
            key={`push-editor-${disableVariablesAutocomplete ? "no-autocomplete" : "autocomplete"}`}
            {...props}
          />
        </div>
      )}
      {...rest}
    />
  );
};
