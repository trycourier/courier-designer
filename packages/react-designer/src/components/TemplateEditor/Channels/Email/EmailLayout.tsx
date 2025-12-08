import { BrandFooter } from "@/components/BrandEditor/Editor/BrandFooter";
import { PreviewPanel } from "@/components/ui/PreviewPanel";
import { VariableInput } from "@/components/ui/VariableEditor";
import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { Email, type EmailProps } from "./Email";
import EmailEditor from "./EmailEditor";
import { SideBar } from "./SideBar";
import { SideBarItemDetails } from "./SideBar/SideBarItemDetails";
import { ChannelRootContainer, EditorSidebar } from "../../Layout";
import { useAtomValue, useSetAtom } from "jotai";
import { templateEditorContentAtom, isSidebarExpandedAtom } from "../../store";
import { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";

export const EmailEditorContainer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...rest }, ref) => (
    <div className={cn("courier-editor-container courier-relative", className)} {...rest} ref={ref}>
      {children}
    </div>
  )
);

export const EmailEditorMain = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    previewMode: "desktop" | "mobile" | undefined;
  }
>(({ children, previewMode, ...rest }, ref) => (
  <div
    className={cn(
      "courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out",
      previewMode && "courier-max-w-4xl courier-mx-auto"
    )}
    {...rest}
    ref={ref}
  >
    {children}
  </div>
));

export interface EmailLayoutProps extends EmailProps {}

export const EmailLayout = ({
  variables,
  theme,
  isLoading,
  hidePublish,
  channels,
  brandEditor,
  routing,
  dataMode,
  ...rest
}: EmailLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const isSidebarExpanded = useAtomValue(isSidebarExpandedAtom);
  const setIsSidebarExpanded = useSetAtom(isSidebarExpandedAtom);

  const handleSubjectAreaClick = () => {
    if (isSidebarExpanded) {
      setIsSidebarExpanded(false);
    }
  };

  return (
    <Email
      value={templateEditorContent}
      variables={variables}
      theme={theme}
      isLoading={isLoading}
      hidePublish={hidePublish}
      channels={channels}
      brandEditor={brandEditor}
      routing={routing}
      dataMode={dataMode}
      render={({
        subject,
        handleSubjectChange,
        selectedNode,
        setSelectedNode,
        previewMode,
        templateEditor,
        ref,
        isBrandApply,
        brandSettings,
        items,
        content,
        syncEditorItems,
        brandEditorContent,
        templateData,
        togglePreviewMode,
        hidePreviewPanelExitButton,
      }) => {
        return (
          <ChannelRootContainer previewMode={previewMode}>
            <div className="courier-flex courier-flex-col courier-flex-1">
              <div
                className="courier-bg-primary courier-h-12 courier-flex courier-items-center courier-gap-2 courier-px-4 courier-border-b courier-pb-1"
                onClick={handleSubjectAreaClick}
              >
                <h4 className="courier-text-sm courier-h-[25px] courier-flex courier-items-end courier-pb-px">
                  Subject:{" "}
                </h4>
                <VariableInput
                  value={subject ?? ""}
                  onChange={(value) =>
                    handleSubjectChange({
                      target: { value },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                  onFocus={() => setSelectedNode(null)}
                  variables={getFlattenedVariables(variables)}
                  className="!courier-bg-background courier-font-medium courier-flex-1"
                  placeholder="Write subject..."
                  readOnly={previewMode !== undefined}
                />
              </div>
              <EmailEditorContainer ref={ref}>
                <EmailEditorMain previewMode={previewMode}>
                  {isBrandApply && (
                    <div
                      className={cn(
                        "courier-py-5 courier-px-9 courier-pb-0 courier-relative courier-overflow-hidden courier-flex courier-flex-col courier-items-start",
                        brandSettings?.headerStyle === "border" && "courier-pt-6"
                      )}
                    >
                      {brandSettings?.headerStyle === "border" && (
                        <div
                          className="courier-absolute courier-top-0 courier-left-0 courier-right-0 courier-h-2"
                          style={{ backgroundColor: brandSettings?.brandColor }}
                        />
                      )}
                      {brandSettings?.logo && (
                        <img
                          src={brandSettings.logo}
                          alt="Brand logo"
                          className="courier-w-auto courier-max-w-36 courier-object-contain courier-cursor-default"
                        />
                      )}
                    </div>
                  )}
                  {content && (
                    <EmailEditor value={content} onUpdate={syncEditorItems} variables={variables} />
                  )}
                  {isBrandApply && templateData && (
                    <div className="courier-py-5 courier-px-9 courier-pt-0 courier-flex courier-flex-col">
                      <BrandFooter
                        readOnly
                        value={
                          brandEditorContent ??
                          templateData?.data?.tenant?.brand?.settings?.email?.footer?.markdown
                        }
                        variables={variables}
                        facebookLink={brandSettings?.facebookLink}
                        linkedinLink={brandSettings?.linkedinLink}
                        instagramLink={brandSettings?.instagramLink}
                        mediumLink={brandSettings?.mediumLink}
                        xLink={brandSettings?.xLink}
                      />
                    </div>
                  )}
                </EmailEditorMain>
                <PreviewPanel
                  previewMode={previewMode}
                  togglePreviewMode={togglePreviewMode}
                  hideExitButton={hidePreviewPanelExitButton}
                />
              </EmailEditorContainer>
            </div>
            <EditorSidebar previewMode={previewMode}>
              <div className="courier-p-1 courier-h-full">
                {selectedNode ? (
                  <SideBarItemDetails element={selectedNode} editor={templateEditor} />
                ) : (
                  <SideBar
                    items={items["Sidebar"]}
                    brandEditor={brandEditor}
                    label="Blocks library"
                    editor={templateEditor ?? undefined}
                  />
                )}
              </div>
            </EditorSidebar>
          </ChannelRootContainer>
        );
      }}
      {...rest}
    />
  );
};
