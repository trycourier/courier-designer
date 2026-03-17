import { BrandFooter } from "@/components/BrandEditor/Editor/BrandFooter";
import { PreviewPanel } from "@/components/ui/PreviewPanel";
import { VariableInput } from "@/components/ui/VariableEditor";
import { getEmailEditorTiptapCssVars } from "@/lib/constants/email-editor-tiptap-styles";
import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { Email, type EmailProps } from "./Email";
import EmailEditor from "./EmailEditor";
import { SideBar } from "./SideBar";
import { SideBarItemDetails } from "./SideBar/SideBarItemDetails";
import { ChannelRootContainer, EditorSidebar } from "../../Layout";
import { useAtomValue, useSetAtom } from "jotai";
import {
  templateEditorContentAtom,
  isSidebarExpandedAtom,
  EMAIL_DEFAULT_BACKGROUND_COLOR,
  EMAIL_DEFAULT_CONTENT_BACKGROUND_COLOR,
} from "../../store";
import { InputColor, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-kit";
import { useEmailBackgroundColors } from "../../hooks/useEmailBackgroundColors";

export const EmailEditorContainer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, style, ...rest }, ref) => (
    <div
      className={cn("courier-editor-container courier-email-editor courier-relative", className)}
      style={{ ...getEmailEditorTiptapCssVars(), ...style }}
      {...rest}
      ref={ref}
    >
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
  disableVariablesAutocomplete,
  theme,
  isLoading,
  hidePublish,
  channels,
  brandEditor,
  routing,
  colorScheme,
  readOnly = false,
  ...rest
}: EmailLayoutProps) => {
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const isSidebarExpanded = useAtomValue(isSidebarExpandedAtom);
  const setIsSidebarExpanded = useSetAtom(isSidebarExpandedAtom);
  const { emailBackgroundColor, emailContentBackgroundColor, handleEmailColorChange } =
    useEmailBackgroundColors();

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
      colorScheme={colorScheme}
      readOnly={readOnly}
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
        readOnly: isReadOnly,
      }) => {
        const effectiveReadOnly = isReadOnly || previewMode !== undefined;
        return (
          <ChannelRootContainer previewMode={previewMode} readOnly={effectiveReadOnly}>
            <div className="courier-flex courier-flex-col courier-flex-1 courier-min-w-0 courier-overflow-hidden">
              <div
                // className="courier-bg-primary courier-h-12 courier-flex courier-items-center courier-gap-2 courier-px-4 courier-border-b courier-pb-1"
                className="courier-bg-background courier-h-12 courier-flex courier-items-center courier-gap-2 courier-px-4 courier-border-b courier-min-w-0"
                onClick={handleSubjectAreaClick}
              >
                <h4 className="courier-text-sm courier-h-[25px] courier-flex courier-items-end courier-pb-[3px] courier-shrink-0">
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
                  className="!courier-bg-background courier-text-sm courier-flex-1 courier-min-w-0"
                  placeholder="Write subject..."
                  data-testid="email-subject-input"
                  readOnly={effectiveReadOnly}
                  showToolbar
                />
              </div>
              <EmailEditorContainer
                ref={ref}
                style={{ backgroundColor: emailBackgroundColor }}
                onClick={(e: React.MouseEvent) => {
                  if (e.target === e.currentTarget) {
                    setSelectedNode(null);
                  }
                }}
              >
                <EmailEditorMain
                  previewMode={previewMode}
                  style={{ backgroundColor: emailContentBackgroundColor }}
                  onClick={(e: React.MouseEvent) => {
                    if (e.target === e.currentTarget) {
                      setSelectedNode(null);
                    }
                  }}
                >
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
                    <EmailEditor
                      key={`email-editor-${disableVariablesAutocomplete ? "no-autocomplete" : "autocomplete"}-${effectiveReadOnly ? "readonly" : "editable"}`}
                      value={content}
                      onUpdate={syncEditorItems}
                      variables={variables}
                      disableVariablesAutocomplete={disableVariablesAutocomplete}
                      readOnly={effectiveReadOnly}
                    />
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
            {!effectiveReadOnly && (
              <EditorSidebar previewMode={previewMode}>
                <div className="courier-p-1 courier-h-full">
                  {selectedNode ? (
                    <SideBarItemDetails element={selectedNode} editor={templateEditor} />
                  ) : (
                    <Tabs
                      defaultValue="blocks"
                      className="courier-h-full courier-flex courier-flex-col"
                    >
                      <TabsList className="courier-w-full courier-flex courier-justify-stretch courier-mb-3">
                        <TabsTrigger value="blocks" className="courier-flex-1">
                          Blocks
                        </TabsTrigger>
                        <TabsTrigger value="design" className="courier-flex-1">
                          Settings
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="blocks" className="courier-flex-1">
                        <SideBar
                          items={items["Sidebar"]}
                          brandEditor={brandEditor}
                          editor={templateEditor ?? undefined}
                        />
                      </TabsContent>
                      <TabsContent value="design">
                        <h4 className="courier-text-sm courier-font-medium courier-mb-3">
                          Body background
                        </h4>
                        <InputColor
                          value={emailBackgroundColor}
                          defaultValue={EMAIL_DEFAULT_BACKGROUND_COLOR}
                          onChange={(value) => handleEmailColorChange("background_color", value)}
                          className="courier-mb-4"
                        />
                        <h4 className="courier-text-sm courier-font-medium courier-mb-3">
                          Content background
                        </h4>
                        <InputColor
                          value={emailContentBackgroundColor}
                          defaultValue={EMAIL_DEFAULT_CONTENT_BACKGROUND_COLOR}
                          onChange={(value) =>
                            handleEmailColorChange("content_background_color", value)
                          }
                        />
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </EditorSidebar>
            )}
          </ChannelRootContainer>
        );
      }}
      {...rest}
    />
  );
};
