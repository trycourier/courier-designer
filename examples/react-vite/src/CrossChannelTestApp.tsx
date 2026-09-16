import { useState } from "react";
import { TemplateProvider, TemplateEditor } from "@trycourier/react-designer";

const VARIABLES = {
  data: { name: "", order_id: "" },
  profile: { email: "" },
  context: { tenant_id: "", locale: "" },
};

const TenantIds = ["aa45b945-69de-42c5-8324-317a2c09c80b", "test-tenant-1"];

const TemplateIds = ["ZB0TXK16W55V1TRQHQCXJTADQTMW", "template-a", "template-b"];

function CrossChannelTestApp() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);

  return (
    <div style={{ minWidth: "800px", width: "70%", height: "90%", margin: "0 auto" }}>
      <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
        Tenant:
        <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          {TenantIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        Template:
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {TemplateIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN || "test-token"}
        apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
        variables={VARIABLES}
      >
        <TemplateEditor
          routing={{
            method: "single",
            channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
          }}
        />
      </TemplateProvider>
    </div>
  );
}

export default CrossChannelTestApp;
