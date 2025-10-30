import { useState } from "react";
import { TemplateProvider, TemplateEditor } from "@trycourier/react-designer";

// Test data for e2e tests
const TenantIds = [
  "aa45b945-69de-42c5-8324-317a2c09c80b",
  "aa45b945-69de-42c5-8324-317a2c09c80c",
  "test-tenant-1",
  "test-tenant-2",
];

const TemplateIds = [
  "ZB0TXK16W55V1TRQHQCXJTADQTMW",
  "8F1XXCQB1F9G6YZTNQT1NNQ1R1YH",
  "template-a",
  "template-b",
  "template-1",
  "template-2",
  "template-3",
];

/**
 * TestApp - Clean version for E2E tests
 * No contentTransformer, no custom hooks - just pure editor
 */
function TestApp() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);
  const [count, setCount] = useState(0);

  return (
    <div style={{ minWidth: "800px", width: "70%", height: "90%", margin: "0 auto" }}>
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

      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN || "test-token"}
        apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
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

export default TestApp;
