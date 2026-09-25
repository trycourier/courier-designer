import { TemplateProvider } from "@trycourier/react-designer";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

/**
 * Mirrors `SAMPLE_DATA` from the handlebars matrix fixture, so the harness
 * previews the same payload the unit tests assert against.
 *
 * `TemplateProvider` is what populates the variable autocomplete — passing
 * `variables` to `TemplateEditor` alone leaves the chips with an empty list.
 */
export const HARNESS_VARIABLES = {
  data: {
    user: { firstName: "ada", lastName: "Lovelace", email: "ada@example.com", isAdmin: true, locale: "en-US" },
    order: { id: "A-1042", status: "shipped", total: 128.5, itemCount: 3, discount: 0,
      note: "Leave at the front door please", shippedAt: "2026-09-15T00:00:00Z", shippedTs: 1789430400 },
    items: [ { name: "Keyboard", qty: 1, price: 89.5 }, { name: "Mouse", qty: 2, price: 19.5 } ],
    tags: ["beta", "vip"],
    emptyList: [],
    profile: { plan: "pro", seats: 12 },
    field: "plan",
    csv: "red,green,blue",
    message: "Your order has shipped and is on its way to you",
    padded: "  spaced out  ",
    trailingComma: "pro,",
    jsonBlob: '{"plan":"pro","seats":12}',
    templateFragment: "Hi {{data.user.firstName}}",
    numberish: "42",
    temperature: -7.6,
    score: 87,
    attempts: 2,
    nickname: "",
    html: "<b>Bold</b>",
    url: "https://example.com/track/A-1042",
  },
};

const TenantIds = [import.meta.env.VITE_TENANT_ID || "test-tenant", "frodo"];
const TemplateIds = [
  import.meta.env.VITE_TEMPLATE_ID || "test-template",
  "dev-12",
  "test-template-copy",
  "test-template-duplicate",
];

const navLinks = [
  { to: "/", label: "Basic" },
  { to: "/custom-elements", label: "Custom Elements" },
  { to: "/custom-hooks", label: "Custom Hooks" },
  { to: "/controlled-value", label: "Controlled Value" },
  { to: "/variable-validation", label: "Variable Validation" },
  { to: "/variable-autocomplete", label: "Variable Autocomplete" },
  { to: "/prefix-validation", label: "Prefix Validation" },
  { to: "/shadow-dom", label: "Shadow DOM" },
  { to: "/locales-test", label: "Locales Test" },
  { to: "/translation-editor", label: "Translation Editor" },
  { to: "/handlebars", label: "Handlebars" },
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
      {/* Navigation */}
      <nav
        style={{
          padding: "12px 20px",
          backgroundColor: "#f8f9fa",
          borderBottom: "1px solid #e9ecef",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: isActive ? "#007bff" : "transparent",
              color: isActive ? "white" : "#495057",
              border: isActive ? "none" : "1px solid #dee2e6",
              transition: "all 0.2s ease",
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

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
        variables={HARNESS_VARIABLES}
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
