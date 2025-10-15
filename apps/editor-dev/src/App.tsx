import {
  TemplateProvider,
  TemplateEditor,
  // useBrandActions,
} from "@trycourier/react-designer";
import "./style.css";
import "@trycourier/react-designer/styles.css";
import { useState, useEffect } from "react";

const TenantIds = [import.meta.env.VITE_TENANT_ID, "frodo"];
const TemplateIds = [import.meta.env.VITE_TEMPLATE_ID, "dev-12"];

// const allowedChannels = ["email", "sms", "push", "inbox"];

const BasicApp = () => {
  return (
    <TemplateEditor
      routing={{
        method: "single",
        channels: ["email", "sms"],
      }}
    />
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
        <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          {TenantIds.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
        Template:
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
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
        // uploadImage={() => {
        //   console.log("uploadImage called");
        //   return Promise.resolve({ url: "https://www.google.com" });
        // }}
      >
        <BasicApp />
      </TemplateProvider>
    </>
  );
}

export default App;
