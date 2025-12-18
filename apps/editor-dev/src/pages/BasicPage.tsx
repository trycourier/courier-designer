import { TemplateEditor } from "@trycourier/react-designer";

/**
 * Basic TemplateEditor demo with default configuration.
 */
export function BasicPage() {
  return (
    <TemplateEditor
      routing={{
        method: "single",
        channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
      }}
    />
  );
}
