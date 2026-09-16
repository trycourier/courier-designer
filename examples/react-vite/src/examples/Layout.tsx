import { TemplateProvider } from "@trycourier/react-designer";
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

const TenantIds = [import.meta.env.VITE_TENANT_ID || "test-tenant", "frodo"];
const TemplateIds = [
  import.meta.env.VITE_TEMPLATE_ID || "test-template",
  "dev-12",
  "test-template-copy",
  "test-template-duplicate",
];

export function Layout() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);
  const [availableTemplates, setAvailableTemplates] = useState(TemplateIds);

  // Callback to add newly created templates to the dropdown
  const handleTemplateCreated = (newTemplateId: string) => {
    if (!availableTemplates.includes(newTemplateId)) {
      setAvailableTemplates((prev) => [...prev, newTemplateId]);
    }
  };

  return (
    <div style={{ minWidth: "800px", width: "70%", height: "90%", margin: "0 auto" }}>
      {/* Examples are reached from the catalog at /examples, not from a nav bar. */}
      <div style={{ padding: "16px 20px 0" }}>
        <Link to="/examples" style={{ fontSize: 13, color: "#0069d9", textDecoration: "none" }}>
          ← All examples
        </Link>
      </div>

      {/* Tenant/Template Selectors */}
      <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
        <label>
          Tenant:{" "}
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            {TenantIds.map((id) => (
              <option value={id} key={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Template:{" "}
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {availableTemplates.map((id) => (
              <option value={id} key={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Template Provider wrapping the outlet */}
      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN || "test-token"}
        apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
        variables={{}}
      >
        <Outlet context={{ templateId, tenantId, handleTemplateCreated }} />
      </TemplateProvider>
    </div>
  );
}

// Hook to access layout context
export interface LayoutContext {
  templateId: string;
  tenantId: string;
  handleTemplateCreated: (templateId: string) => void;
}
