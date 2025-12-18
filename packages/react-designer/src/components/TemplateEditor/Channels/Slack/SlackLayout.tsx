import type { SlackProps } from "./Slack";
import { Slack } from "./Slack";
import { SlackEditor } from "./SlackEditor";
import { useAtomValue } from "jotai";
import { templateEditorContentAtom } from "../../store";
import { ChannelRootContainer, EditorSidebar } from "../../Layout";
import { SlackSideBar, SlackSideBarItemDetails } from "./SideBar";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SlackLayoutProps extends SlackProps {}

export const SlackEditorContainer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...rest }, ref) => (
    <div className={cn("courier-editor-container courier-relative", className)} {...rest} ref={ref}>
      {children}
    </div>
  )
);

export const SlackEditorMain = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, ...rest }, ref) => (
    <div
      className="courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out"
      {...rest}
      ref={ref}
    >
      {children}
    </div>
  )
);

export const SlackLayout = ({
  hidePublish,
  theme,
  variables,
  disableVariablesAutocomplete,
  channels,
  routing,
  colorScheme,
}: SlackLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);

  return (
    <Slack
      value={templateEditorContent}
      variables={variables}
      disableVariablesAutocomplete={disableVariablesAutocomplete}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      colorScheme={colorScheme}
      render={(props) => {
        return (
          <ChannelRootContainer>
            <div className="courier-flex courier-flex-col courier-flex-1">
              <SlackEditorContainer>
                <SlackEditorMain>
                  <SlackEditor
                    key={`slack-editor-${disableVariablesAutocomplete ? "no-autocomplete" : "autocomplete"}`}
                    {...props}
                  />
                </SlackEditorMain>
              </SlackEditorContainer>
            </div>
            <EditorSidebar>
              <div className="courier-p-1 courier-h-full">
                <SlackSideBarItemDetails
                  element={props.selectedNode}
                  editor={props.slackEditor}
                  defaultElement={
                    <SlackSideBar
                      items={props.items.Sidebar}
                      label="Blocks library"
                      editor={props.slackEditor ?? undefined}
                    />
                  }
                />
              </div>
            </EditorSidebar>
          </ChannelRootContainer>
        );
      }}
    />
  );
};
