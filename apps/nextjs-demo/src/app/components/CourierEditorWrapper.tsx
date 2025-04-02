"use client";

import "@trycourier/react-editor/styles.css";
import dynamic from "next/dynamic";
// import { ActionPanel } from "./ActionPanel";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const CourierTemplateProvider = dynamic(
  () =>
    import("@trycourier/react-editor").then((mod) => {
      const Component = mod.CourierTemplateProvider || mod.default?.CourierTemplateProvider;
      if (!Component) throw new Error("Could not load CourierTemplateProvider");
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

export function CourierEditorWrapper() {
  return (
    <CourierTemplateProvider
      templateId={process.env.NEXT_PUBLIC_TEMPLATE_ID || ""}
      tenantId={process.env.NEXT_PUBLIC_TENANT_ID || ""}
      token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
      apiUrl={process.env.NEXT_PUBLIC_API_URL || ""}
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
    </CourierTemplateProvider>
  );
}
