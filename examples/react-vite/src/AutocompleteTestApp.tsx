import { TemplateProvider, TemplateEditor } from "@trycourier/react-designer";

const VARIABLES = {
  user: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
  },
  order: {
    id: "ORD-12345",
    total: "$99.99",
    status: "shipped",
    trackingNumber: "1Z999AA10123456784",
  },
  company: {
    name: "Acme Inc.",
    supportEmail: "support@acme.com",
    website: "https://acme.com",
  },
  notification: {
    type: "order_update",
    timestamp: "2025-01-15T10:30:00Z",
  },
};

export default function AutocompleteTestApp() {
  return (
    <div style={{ minWidth: "800px", width: "70%", height: "90%", margin: "0 auto" }}>
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#e8f4fd",
          borderRadius: "8px",
          border: "1px solid #b3d7f5",
        }}
      >
        <strong>Variable Autocomplete Test:</strong> Type <code>{"{{ "}</code>
        in the editor to see autocomplete suggestions.
      </div>

      <TemplateProvider
        templateId="autocomplete-test"
        tenantId="test-tenant"
        token={import.meta.env.VITE_JWT_TOKEN || "test-token"}
        apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
        variables={VARIABLES}
      >
        <TemplateEditor
          routing={{
            method: "single",
            channels: ["email", "sms"],
          }}
        />
      </TemplateProvider>
    </div>
  );
}
