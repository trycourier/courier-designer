import { TemplateEditor } from "@trycourier/react-designer";

const SAMPLE_DATA = {
  data: {
    items: [
      { name: "Widget A", price: 9.99 },
      { name: "Widget B", price: 19.99 },
    ],
    info: {
      firstName: "John",
      lastName: "Doe",
    },
  },
};

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
      brandEditor
      sampleData={SAMPLE_DATA}
    />
  );
}
