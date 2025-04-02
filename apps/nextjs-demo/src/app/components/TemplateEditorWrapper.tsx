"use client";

import "@trycourier/react-editor/styles.css";
import dynamic from "next/dynamic";
// import { ActionPanel } from "./ActionPanel";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const EditorProvider = dynamic(
  () =>
    import("@trycourier/react-editor").then((mod) => {
      const Component = mod.EditorProvider || mod.default?.EditorProvider;
      if (!Component) throw new Error("Could not load EditorProvider");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

const TemplateEditor = dynamic(
  () =>
    import("@trycourier/react-editor").then((mod) => {
      const Component = mod.TemplateEditor || mod.default?.TemplateEditor;
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
    <EditorProvider
      templateId={process.env.NEXT_PUBLIC_TEMPLATE_ID || ""}
      tenantId={process.env.NEXT_PUBLIC_TENANT_ID || ""}
      token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
      clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY || ""}
    >
      {/* <ActionPanel /> */}
      <TemplateEditor
        // autoSave={false}
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
    </EditorProvider>
  );
}
