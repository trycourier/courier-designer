import type { MSTeamsProps } from "./MSTeams";
import { MSTeams } from "./MSTeams";
import { MSTeamsEditor } from "./MSTeamsEditor";
import { useAtomValue } from "jotai";
import { templateEditorContentAtom } from "../../store";
import { MSTeamsSideBar, MSTeamsSideBarItemDetails } from "./SideBar";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChannelRootContainer, EditorSidebar } from "../../Layout";

export interface MSTeamsLayoutProps extends MSTeamsProps {}

export const MSTeamsEditorContainer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...rest }, ref) => (
    <div className={cn("courier-editor-container courier-relative", className)} {...rest} ref={ref}>
      {children}
    </div>
  )
);

export const MSTeamsEditorMain = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
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

export const MSTeamsLayout = ({
  hidePublish,
  theme,
  variables,
  disableVariablesAutocomplete,
  channels,
  routing,
  colorScheme,
}: MSTeamsLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);

  return (
    <MSTeams
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
              <MSTeamsEditorContainer>
                <MSTeamsEditorMain>
                  <MSTeamsEditor
                    key={`msteams-editor-${disableVariablesAutocomplete ? "no-autocomplete" : "autocomplete"}`}
                    {...props}
                  />
                </MSTeamsEditorMain>
              </MSTeamsEditorContainer>
            </div>
            <EditorSidebar>
              <div className="courier-p-1 courier-h-full">
                <MSTeamsSideBarItemDetails
                  element={props.selectedNode}
                  editor={props.msteamsEditor}
                  defaultElement={
                    <MSTeamsSideBar
                      items={props.items.Sidebar}
                      label="Blocks library"
                      editor={props.msteamsEditor ?? undefined}
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
