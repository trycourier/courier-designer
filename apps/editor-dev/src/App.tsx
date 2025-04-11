import {
  TemplateProvider,
  TemplateEditor,
  // BrandEditor,
  useTemplateActions,
  // useBrandActions,
  // useTemplateActions,
} from "@trycourier/react-editor";
import "@trycourier/react-editor/styles.css";
import "./style.css";
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

const TenantIds = [import.meta.env.VITE_TENANT_ID, "playground"];
const TemplateIds = [import.meta.env.VITE_TEMPLATE_ID, "template2"];

function App() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);
  const { publishTemplate } = useTemplateActions();
  // const { publishBrand } = useBrandActions()

  useEffect(() => {
    setTimeout(() => {
      // setTenantId(TenantIds[1]);
      setTemplateId(TemplateIds[1]);
    }, 100);
  }, []);

  const handlePublishTemplate = async () => {
    await publishTemplate();
  };

  return (
    <>
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
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 20, justifyContent: "center" }}>
        <button onClick={handlePublishTemplate}>Publish</button>
      </div>
      <TemplateProvider
        clientKey={import.meta.env.VITE_CLIENT_KEY}
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
          <h1 style={{ marginBottom: 20 }}>React Editor Development</h1>
          {/* <ActionPanel /> */}
          <div style={{ width: "70vw", height: "80vh" }}>
            <TemplateEditor
              brandEditor
              hidePublish
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
