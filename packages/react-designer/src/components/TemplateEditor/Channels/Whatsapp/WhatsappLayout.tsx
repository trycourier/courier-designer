import { CanvasIssueGutter } from "../../CanvasIssues";
import type { WhatsappProps } from "./Whatsapp";
import { Whatsapp } from "./Whatsapp";
import { WhatsappEditor } from "./WhatsappEditor";
import { WhatsappSideBar } from "./WhatsappSideBar";
import { SlackSideBar } from "../Slack/SideBar";
import { useAtomValue } from "jotai";
import { templateEditorAtom, templateEditorContentAtom } from "../../store";

export interface WhatsappLayoutProps extends WhatsappProps {}

export const WhatsappLayout = ({
  hidePublish,
  theme,
  variables,
  disableVariablesAutocomplete,
  channels,
  routing,
  readOnly,
  ...rest
}: WhatsappLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const templateEditor = useAtomValue(templateEditorAtom);

  return (
    <Whatsapp
      value={templateEditorContent}
      variables={variables}
      disableVariablesAutocomplete={disableVariablesAutocomplete}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      readOnly={readOnly}
      render={(props) => (
        <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
          {!readOnly && (
            <div className="courier-editor-sidebar courier-w-64 courier-flex-shrink-0 courier-border-r courier-border-border courier-p-3">
              <SlackSideBar items={props.items.Sidebar} editor={templateEditor ?? undefined} />
            </div>
          )}
          <div className="courier-relative courier-flex courier-flex-col courier-flex-1 courier-py-8 courier-items-center">
            <WhatsappEditor
              key={`whatsapp-editor-${disableVariablesAutocomplete ? "no-autocomplete" : "autocomplete"}-${readOnly ? "readonly" : "editable"}`}
              {...props}
            />
            <CanvasIssueGutter channel="whatsapp" mode="summary" enabled={!readOnly} />
          </div>
          {!readOnly && (
            <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
              <div className="courier-p-4 courier-h-full">
                <WhatsappSideBar selectedNode={props.selectedNode} editor={props.whatsappEditor} />
              </div>
            </div>
          )}
        </div>
      )}
      {...rest}
    />
  );
};
