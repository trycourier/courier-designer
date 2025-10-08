"use client";

import "@trycourier/react-designer/styles.css";
import dynamic from "next/dynamic";
import "../globals.css";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const TemplateEditor = dynamic(
  () =>
    import("@trycourier/react-designer").then((mod) => {
      const Component = mod.TemplateEditor;
      if (!Component) throw new Error("Could not load TemplateEditor");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

export function TemplateEditorWrapper() {
  return (
    <TemplateEditor
      // dataMode="dark"
      routing={{
        method: "single",
        channels: ["email", "sms", "push", "inbox"],
      }}
      // hidePublish
      // key={counter}
      // className="template-editor-wrapper"
      brandEditor
      variables={{
        user: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        company: {
          name: "Acme Inc",
          address: {
            street: "123 Main St",
            city: "San Francisco",
          },
        },
      }}
    />
  );
}
