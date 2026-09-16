import { TemplateProvider, TemplateEditor } from "@trycourier/react-designer";

/**
 * ReadOnlyTestApp - E2E test page for readOnly mode
 * Renders TemplateEditor with readOnly={true}
 */
function ReadOnlyTestApp() {
  return (
    <div style={{ minWidth: "800px", width: "70%", height: "90%", margin: "0 auto" }}>
      <TemplateProvider
        templateId="ZB0TXK16W55V1TRQHQCXJTADQTMW"
        tenantId="aa45b945-69de-42c5-8324-317a2c09c80b"
        token={import.meta.env.VITE_JWT_TOKEN || "test-token"}
        apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
      >
        <TemplateEditor
          readOnly
          routing={{
            method: "single",
            channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
          }}
        />
      </TemplateProvider>
    </div>
  );
}

export default ReadOnlyTestApp;
