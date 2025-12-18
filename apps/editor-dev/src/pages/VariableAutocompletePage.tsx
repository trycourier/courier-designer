import { TemplateEditor } from "@trycourier/react-designer";

/**
 * Sample variables for autocomplete suggestions.
 * These represent the data available in a typical notification template.
 */
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

/**
 * Demo page showcasing variable autocomplete functionality.
 *
 * Type {{ in the editor to see autocomplete suggestions from the VARIABLES object above.
 * Select a variable from the dropdown or continue typing to filter.
 */
export function VariableAutocompletePage() {
  return (
    <div>
      {/* Info banner */}
      <div
        style={{
          backgroundColor: "#e8f4fd",
          border: "1px solid #b3d7f5",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "16px",
        }}
      >
        <strong>Variable Autocomplete Demo:</strong> Type{" "}
        <code style={{ backgroundColor: "#f1f3f4", padding: "2px 6px", borderRadius: "4px" }}>
          {"{{"}
        </code>{" "}
        in the editor to see autocomplete suggestions. Available variables: user.*, order.*,
        company.*, notification.*
      </div>

      <TemplateEditor
        variables={VARIABLES}
        routing={{
          method: "single",
          channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
        }}
      />
    </div>
  );
}
