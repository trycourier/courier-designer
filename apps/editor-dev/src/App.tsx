import {
  TemplateProvider,
  TemplateEditor,
  cn,
  // BrandEditor,
  useTemplateActions,
  EmailChannel,
  SortableContext,
  EmailEditor,
  TextMenu,
  PreviewPanel,
  BrandFooter,
  SideBarElementsList,
  SideBarItemDetails,
  useChannels,
  // useBrandActions,
  // useTemplateActions,
} from "@trycourier/react-designer";
import "./style.css";
import "@trycourier/react-designer/styles.css";
import { useState, useEffect } from "react";

// const ActionPanel = () => {
//   const { saveTemplate, publishTemplate } = useTemplateActions();

//   const handleSaveTemplate = async () => {
//     await saveTemplate();
//   };

//   const handlePublishTemplate = async () => {
//     await publishTemplate();
//   };

//   return (
//     <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
//       <button
//         style={{ backgroundColor: "green", color: "white", padding: 10, borderRadius: 5 }}
//         onClick={handleSaveTemplate}
//       >
//         Save
//       </button>
//       <button
//         style={{ backgroundColor: "blue", color: "white", padding: 10, borderRadius: 5 }}
//         onClick={handlePublishTemplate}
//       >
//         Publish
//       </button>
//     </div>
//   );
// };

const TenantIds = [import.meta.env.VITE_TENANT_ID, "bilbo"];
const TemplateIds = [import.meta.env.VITE_TEMPLATE_ID, "dev-12"];

function App() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);
  const { publishTemplate } = useTemplateActions();
  const [count, setCount] = useState(0);
  const { enabledChannels, disabledChannels } = useChannels({ channels: ["email", "sms"] });

  const isLoading = false;
  const variables = {
    user: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    },
  };
  // const { publishBrand } = useBrandActions()

  useEffect(() => {
    setTimeout(() => {
      // setTenantId(TenantIds[1]);
      // setTemplateId(TemplateIds[1]);
    }, 100);
  }, []);

  const handlePublishTemplate = async () => {
    await publishTemplate();
  };

  return (
    <>
      {/* Test div to check if tailwind is working */}
      <div className="bg-red-500 text-white p-4 text-center">
        Tailwind Test - This should be red background with white text
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
        Tenant:
        <select onChange={(e) => setTenantId(e.target.value)}>
          {TenantIds.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
        Template:
        <select onChange={(e) => setTemplateId(e.target.value)}>
          {TemplateIds.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
        Count: {count}
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 20, justifyContent: "center" }}>
        <button onClick={handlePublishTemplate}>Publish</button>
      </div>
      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN}
      >
        <div
          style={{
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1 style={{ marginBottom: 20 }}>React Designer Development</h1>
          {/* <ActionPanel /> */}
          <div style={{ width: "100vw", height: "80vh" }}>
            <EmailChannel
              render={({
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
                selectedNode,
              }) => (
                <div
                  className={cn(
                    "courier-flex courier-flex-1 courier-overflow-hidden",
                    previewMode && "courier-editor-preview-mode",
                    previewMode === "mobile" && "courier-editor-preview-mode-mobile"
                  )}
                >
                  <div className="flex flex-col flex-shrink-0 bg-white p-1.5 w-14">
                    {enabledChannels.map((channel) => (
                      <div key={channel.value}>{channel.label}</div>
                    ))}
                    {disabledChannels.map((channel) => (
                      <div key={channel.value} style={{ color: "#e0e0e0" }}>
                        {channel.label}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{ padding: 12 }}
                    className={cn(
                      "courier-editor-sidebar",
                      previewMode
                        ? "courier-opacity-0 courier-pointer-events-none courier-translate-x-full courier-w-0 courier-flex-shrink-0"
                        : "courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0"
                    )}
                  >
                    <SideBarElementsList items={items["Sidebar"]} brandEditor={false} />
                  </div>
                  <div className="courier-flex courier-flex-col courier-flex-1">
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
                      <PreviewPanel
                        previewMode={previewMode}
                        togglePreviewMode={togglePreviewMode}
                      />
                    </div>
                  </div>
                  <div
                    style={{ padding: 12 }}
                    className={cn(
                      "courier-editor-sidebar",
                      previewMode
                        ? "courier-opacity-0 courier-pointer-events-none courier-translate-x-full courier-w-0 courier-flex-shrink-0"
                        : "courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0"
                    )}
                  >
                    {selectedNode && (
                      <SideBarItemDetails element={selectedNode} editor={emailEditor} />
                    )}
                  </div>
                </div>
              )}
            />
            <TemplateEditor
              brandEditor
              channels={["email", "sms", "push", "inbox"]}
              routing={{
                method: "single",
                channels: ["email", "sms"],
              }}
              // hidePublish
              // autoSave={false}
              // brandProps={{
              //   hidePublish: false,
              // }}
              // theme="myTheme"
              // theme={{
              //   background: '#ffffff',
              //   foreground: '#292929',
              //   muted: '#D9D9D9',
              //   mutedForeground: '#A3A3A3',
              //   popover: '#ffffff',
              //   popoverForeground: '#292929',
              //   border: '#DCDEE4',
              //   input: '#DCDEE4',
              //   card: '#FAF9F8',
              //   cardForeground: '#292929',
              //   primary: '#ffffff',
              //   primaryForeground: '#696F8C',
              //   secondary: '#F5F5F5',
              //   secondaryForeground: '#171717',
              //   accent: '#E5F3FF',
              //   accentForeground: '#1D4ED8',
              //   destructive: '#292929',
              //   destructiveForeground: '#FF3363',
              //   ring: '#80849D',
              //   radius: '6px',
              // }}
              variables={{
                user: {
                  firstName: "John",
                  lastName: "Doe",
                  email: "john@example.com",
                },
                company: {
                  name: "Acme Inc",
                  address: {
                    street: "123 Main St",
                    city: "San Francisco",
                  },
                },
              }}
              // onChange={(value) => {
              //   console.log("value", JSON.stringify(value, null, 2));
              // }}
            />
            {/* <BrandEditor
              // value={{
              //   colors: {
              //     primary: '#ff0000',
              //     secondary: '#000000',
              //     tertiary: '#000000',
              //   },
              // }}
              onChange={(value) => {
                console.log("value", JSON.stringify(value, null, 2));
              }}
            /> */}
          </div>
        </div>
      </TemplateProvider>
    </>
  );
}

export default App;
