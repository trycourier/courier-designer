import {
  TemplateProvider,
  // TemplateEditor,
  cn,
  // BrandEditor,
  // useTemplateActions,
  EmailChannel,
  SMSChannel,
  PushChannel,
  InboxChannel,
  SortableContext,
  EmailEditor,
  PreviewPanel,
  BrandFooter,
  EmailSideBar,
  EmailSideBarItemDetails,
  useChannels,
  ChannelRootContainer,
  EmailEditorContainer,
  EmailEditorMain,
  EditorSidebar,
  SMSEditor,
  PushEditor,
  InboxEditor,
  InboxSideBar,
  useTemplateActions,
  // useBrandActions,
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

const templateDataTemp = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        {
          type: "meta",
          title: "Test1",
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          text_style: "h1",
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "aaaa\n",
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "bbbb\n",
        },
        {
          width: "1%",
          border: {
            color: "#000000",
            enabled: true,
          },
          type: "image",
          align: "center",
          src: "",
        },
      ],
    },
    {
      type: "channel",
      channel: "sms",
      elements: [
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "Wow\n",
        },
      ],
    },
    {
      type: "channel",
      channel: "push",
      elements: [
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          text_style: "h2",
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "rewrw\n",
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "fdgfdg\n",
        },
      ],
    },
    {
      type: "channel",
      channel: "inbox",
      elements: [
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          text_style: "h2",
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "aaagf g fd h gfh dh dgh fgjr gj djhg jdgh jdhgj dhgj dghj hjdghj\n",
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "vvv\n",
        },
        {
          border: {
            color: "#000000",
            size: "1px",
            radius: 4,
            enabled: true,
          },
          padding: "6px",
          background_color: "#000000",
          color: "#ffffff",
          href: "",
          type: "action",
          align: "left",
          content: "Register",
        },
      ],
    },
  ],
};

const TenantIds = [import.meta.env.VITE_TENANT_ID, "frodo"];
const TemplateIds = [import.meta.env.VITE_TEMPLATE_ID, "dev-12"];

// const allowedChannels = ["email", "sms", "push", "inbox"];
const allowedChannels = ["email", "sms", "push", "inbox"];

const ChannelList = () => {
  const { enabledChannels, disabledChannels, setChannel, addChannel } = useChannels({
    channels: allowedChannels,
  });

  return (
    <>
      {enabledChannels.map((channel) => (
        <button key={channel.value} onClick={() => setChannel(channel.value)}>
          {channel.label}
        </button>
      ))}
      {disabledChannels.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) {
              addChannel(e.target.value);
            }
          }}
        >
          <option value="">- select channel -</option>
          {disabledChannels.map((channel) => (
            <option key={channel.value} value={channel.value}>
              {channel.label}
            </option>
          ))}
        </select>
      )}
    </>
  );
};

const ChannelHeader = ({ channel }: { channel: string }) => {
  const { removeChannel } = useChannels({
    channels: allowedChannels,
  });

  const handleRemoveChannel = () => {
    removeChannel(channel);
  };

  return (
    <div>
      Channel Header {channel}
      <button onClick={handleRemoveChannel} style={{ marginLeft: 10 }}>
        Remove
      </button>
    </div>
  );
};

const ChannelContent = () => {
  const { channel } = useChannels({
    channels: allowedChannels,
  });
  const { setIsTemplateLoading } = useTemplateActions();
  const [templateEditorData, setTemplateEditorData] = useState<any>();

  useEffect(() => {
    setIsTemplateLoading(true);
    setTimeout(() => {
      setTemplateEditorData(templateDataTemp);
      setIsTemplateLoading(false);
      // setTemplateData(templateDataTemp as any);
    }, 1000);
  }, [setTemplateEditorData, setIsTemplateLoading]);

  const variables = {
    user: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    },
  };

  return (
    <>
      {channel === "sms" && (
        <SMSChannel
          routing={{
            method: "single",
            channels: ["email", "sms"],
          }}
          headerRenderer={() => <ChannelHeader channel="sms" />}
          render={(props) => (
            <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
              <SMSEditor {...props} />
            </div>
          )}
        />
      )}
      {channel === "push" && (
        <PushChannel
          routing={{
            method: "single",
            channels: ["email", "sms"],
          }}
          headerRenderer={() => <div>SMS Header</div>}
          render={(props) => (
            <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
              <PushEditor {...props} />
            </div>
          )}
        />
      )}
      {channel === "inbox" && (
        <InboxChannel
          routing={{
            method: "single",
            channels: ["email", "sms"],
          }}
          headerRenderer={() => <div>Inbox Header</div>}
          render={(props) => (
            <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
              <div className="courier-flex courier-flex-col courier-flex-1 courier-py-8 courier-items-center">
                <InboxEditor {...props} />
              </div>
              <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
                <div className="courier-p-4 courier-h-full">
                  <InboxSideBar />
                </div>
              </div>
            </div>
          )}
        />
      )}
      {channel === "email" && (
        <EmailChannel
          value={templateEditorData}
          routing={{
            method: "single",
            channels: ["email", "sms"],
          }}
          // headerRenderer={({ hidePublish, channels, routing }) => (
          headerRenderer={() => <div>Email Header</div>}
          render={({
            subject,
            handleSubjectChange,
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
            templateData,
            togglePreviewMode,
            selectedNode,
          }) => (
            <ChannelRootContainer previewMode={previewMode}>
              <EditorSidebar style={{ padding: 12 }} previewMode={previewMode}>
                <EmailSideBar items={items["Sidebar"]} brandEditor={false} />
              </EditorSidebar>
              <div className="courier-flex courier-flex-col courier-flex-1">
                <div className="courier-bg-primary courier-h-12 courier-flex courier-items-center courier-gap-2 courier-px-4 courier-border-b">
                  <h4 className="courier-text-sm">Subject: </h4>
                  <input
                    value={subject ?? ""}
                    onChange={handleSubjectChange}
                    onFocus={() => setSelectedNode(null)}
                    className="!courier-bg-background read-only:courier-cursor-default read-only:courier-border-transparent md:courier-text-md courier-py-1 courier-border-transparent !courier-border-none courier-font-medium"
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
                    <SortableContext items={items["Editor"]} strategy={strategy}>
                      {content && <EmailEditor value={content} onUpdate={syncEditorItems} />}
                    </SortableContext>
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
                  <PreviewPanel previewMode={previewMode} togglePreviewMode={togglePreviewMode} />
                </EmailEditorContainer>
              </div>
              <EditorSidebar previewMode={previewMode} style={{ padding: 12 }}>
                {selectedNode && (
                  <EmailSideBarItemDetails element={selectedNode} editor={emailEditor} />
                )}
              </EditorSidebar>
            </ChannelRootContainer>
          )}
        />
      )}
    </>
  );
};

function App() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);
  // const { publishTemplate } = useTemplateActions();
  const [count, setCount] = useState(0);

  // const isLoading = false;
  // const { publishBrand } = useBrandActions()

  useEffect(() => {
    setTimeout(() => {
      // setTenantId(TenantIds[1]);
      // setTemplateId(TemplateIds[1]);
    }, 100);
  }, []);

  // const handlePublishTemplate = async () => {
  //   await publishTemplate();
  // };

  return (
    <>
      {/* <div className="bg-red-500 text-white p-4 text-center">
        Tailwind Test - This should be red background with white text
      </div> */}
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
      {/* <div style={{ display: "flex", flexDirection: "row", gap: 20, justifyContent: "center" }}>
        <button onClick={handlePublishTemplate}>Publish</button>
      </div> */}
      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN}
      >
        <div
          style={{
            padding: "40px",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <div className="flex flex-col flex-shrink-0 bg-white p-1.5 w-14">
            <ChannelList />
          </div>
          <div style={{ width: "100vw", height: "80vh" }}>
            <ChannelContent />

            {/* <TemplateEditor
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
            /> */}
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
