import { TemplateProvider, TemplateEditor } from "@trycourier/react-designer";

/**
 * FullCycleTestApp - Dedicated test page for full-cycle E2E tests.
 *
 * Reads all configuration from environment variables (.env.fullcycle)
 * so there are no hardcoded tenant/template IDs. This connects to the
 * real Courier API and uses the actual workspace credentials.
 *
 * Route: /full-cycle-test
 */
function FullCycleTestApp() {
  const tenantId = import.meta.env.VITE_TENANT_ID || "test-tenant-123";
  const templateId = import.meta.env.VITE_TEMPLATE_ID || "full-cycle-test-template";
  const token = import.meta.env.VITE_JWT_TOKEN || "";
  const apiUrl = import.meta.env.VITE_API_URL || "https://api.courier.com/client/q";

  return (
    <div style={{ minWidth: "800px", width: "70%", height: "90%", margin: "0 auto" }}>
      <div
        style={{
          padding: "12px 20px",
          display: "flex",
          flexDirection: "row",
          gap: 16,
          alignItems: "center",
          fontSize: 13,
          color: "#666",
          borderBottom: "1px solid #eee",
        }}
      >
        <span>
          <strong>Full-Cycle Test</strong>
        </span>
        <span>Tenant: {tenantId}</span>
        <span>Template: {templateId}</span>
        <span>API: {apiUrl}</span>
      </div>

      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={token}
        apiUrl={apiUrl}
        variables={{ name: "John" }}
      >
        <TemplateEditor
          routing={{
            method: "single",
            channels: ["email"],
          }}
          autoSave
        />
      </TemplateProvider>
    </div>
  );
}

export default FullCycleTestApp;
