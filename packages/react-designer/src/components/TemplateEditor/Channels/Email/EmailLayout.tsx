import { BrandFooter } from "@/components/BrandEditor/Editor/BrandFooter";
import { Input } from "@/components/ui-kit";
import { PreviewPanel } from "@/components/ui/PreviewPanel";
import { TextMenu } from "@/components/ui/TextMenu";
import { cn } from "@/lib/utils";
import { SortableContext } from "@dnd-kit/sortable";
import { Email, type EmailProps } from "./Email";
import EmailEditor from "./EmailEditor";
import { SideBar } from "./SideBar";
import { SideBarItemDetails } from "./SideBar/SideBarItemDetails";

export interface EmailLayoutProps extends EmailProps {}

export const EmailLayout = ({
  variables,
  theme,
  isLoading,
  hidePublish,
  channels,
  brandEditor,
}: EmailLayoutProps) => {
  return (
    <Email
      variables={variables}
      theme={theme}
      isLoading={isLoading}
      hidePublish={hidePublish}
      channels={channels}
      brandEditor={brandEditor}
      render={({
        subject,
        handleSubjectChange,
        selectedNode,
        setSelectedNode,
        previewMode,
        emailEditor,
        ref,
        isBrandApply,
        brandSettings,
        items,
        content,
        strategy,
        syncEditorItems,
        brandEditorContent,
        tenantData,
        togglePreviewMode,
      }) => (
        <div
          className={cn(
            "courier-flex courier-flex-1 courier-overflow-hidden",
            previewMode && "courier-editor-preview-mode",
            previewMode === "mobile" && "courier-editor-preview-mode-mobile"
          )}
        >
          <div className="courier-flex courier-flex-col courier-flex-1">
            <div className="courier-bg-primary courier-h-12 courier-flex courier-items-center courier-gap-2 courier-px-4 courier-border-b">
              <h4 className="courier-text-sm">Subject: </h4>
              <Input
                value={subject ?? ""}
                onChange={handleSubjectChange}
                onFocus={() => setSelectedNode(null)}
                className="!courier-bg-background read-only:courier-cursor-default read-only:courier-border-transparent md:courier-text-md courier-py-1 courier-border-transparent !courier-border-none courier-font-medium"
                placeholder="Write subject..."
                readOnly={previewMode !== undefined}
              />
            </div>
            {!isLoading && emailEditor && <TextMenu editor={emailEditor} />}
            <div className="courier-editor-container courier-relative" ref={ref}>
              <div
                className={cn(
                  "courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out",
                  previewMode && "courier-max-w-4xl courier-mx-auto"
                )}
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
                <SortableContext items={items["Editor"]} strategy={strategy}>
                  {content && <EmailEditor value={content} onUpdate={syncEditorItems} />}
                </SortableContext>
                {isBrandApply && tenantData && (
                  <div className="courier-py-5 courier-px-9 courier-pt-0 courier-flex courier-flex-col">
                    <BrandFooter
                      readOnly
                      value={
                        brandEditorContent ??
                        tenantData?.data?.tenant?.brand?.settings?.email?.footer?.markdown
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
              </div>
              <PreviewPanel previewMode={previewMode} togglePreviewMode={togglePreviewMode} />
            </div>
          </div>
          <div
            className={cn(
              "courier-editor-sidebar",
              previewMode
                ? "courier-opacity-0 courier-pointer-events-none courier-translate-x-full courier-w-0 courier-flex-shrink-0"
                : "courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0"
            )}
          >
            <div className="courier-p-4 courier-h-full">
              {selectedNode ? (
                <SideBarItemDetails element={selectedNode} editor={emailEditor} />
              ) : (
                <SortableContext items={items["Sidebar"]} strategy={strategy}>
                  <SideBar
                    items={items["Sidebar"]}
                    brandEditor={brandEditor}
                    label="Blocks library"
                  />
                </SortableContext>
              )}
            </div>
          </div>
        </div>
      )}
    />
  );
};
