import {
  TemplateProvider,
  BrandProvider,
  TemplateEditor,
  // useTemplateActions,
} from "@trycourier/react-editor";
import "@trycourier/react-editor/styles.css";
import "./style.css";
import { useState } from "react";

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

const TenantIds = [import.meta.env.VITE_TENANT_ID, "tenant2"]
const TemplateIds = [import.meta.env.VITE_TEMPLATE_ID, "template2"]

function App() {
  const [tenantId, setTenantId] = useState(TenantIds[0])
  const [templateId, setTemplateId] = useState(TemplateIds[0])

  return (
    <>
      <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
        Tenant:
        <select onChange={(e) => setTenantId(e.target.value)}>
          {TenantIds.map((id) => (
            <option value={id} key={id}>{id}</option>
          ))}
        </select>
        Template:
        <select onChange={(e) => setTemplateId(e.target.value)}>
          {TemplateIds.map((id) => (
            <option value={id} key={id}>{id}</option>
          ))}
        </select>
      </div>
      <BrandProvider
        clientKey={import.meta.env.VITE_CLIENT_KEY}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN}
      >
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
                brandEditor={true}
                // autoSave={false}
                // theme={{
                //   background: "#ff0000",
                // }}
                // theme="myTheme"

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
              {/* <BrandEditor /> */}
            </div>
          </div>
        </TemplateProvider>
      </BrandProvider>
    </>
  );
}

export default App;
