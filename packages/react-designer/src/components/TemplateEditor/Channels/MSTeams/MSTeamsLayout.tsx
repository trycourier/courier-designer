import type { MSTeamsProps } from "./MSTeams";
import { MSTeams } from "./MSTeams";
import { MSTeamsEditor } from "./MSTeamsEditor";
import { useAtomValue } from "jotai";
import { templateEditorContentAtom } from "../../store";
import { MSTeamsSideBar } from "./SideBar";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface MSTeamsLayoutProps extends MSTeamsProps {}

export const MSTeamsEditorContainer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...rest }, ref) => (
    <div className={cn("courier-editor-container courier-relative", className)} {...rest} ref={ref}>
      {children}
    </div>
  )
);

export const MSTeamsEditorMain = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, ...rest }, ref) => (
  <div
    className="courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out"
    {...rest}
    ref={ref}
  >
    {children}
  </div>
));

export const MSTeamsLayout = ({
  hidePublish,
  theme,
  variables,
  channels,
  routing,
}: MSTeamsLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);

  return (
    <MSTeams
      value={templateEditorContent}
      variables={variables}
      theme={theme}
      hidePublish={hidePublish}
      channels={channels}
      routing={routing}
      render={(props) => {
        return (
          <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
            <div className="courier-editor-sidebar courier-transition-all courier-duration-300 courier-ease-in-out courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
              <div className="courier-p-4 courier-h-full">
                <MSTeamsSideBar items={props.items.Sidebar} label="Blocks library" />
              </div>
            </div>
            <div className="courier-flex courier-flex-col courier-flex-1">
              <MSTeamsEditorContainer>
                <MSTeamsEditorMain>
                  <MSTeamsEditor {...props} />
                </MSTeamsEditorMain>
              </MSTeamsEditorContainer>
            </div>
          </div>
        );
      }}
    />
  );
};
