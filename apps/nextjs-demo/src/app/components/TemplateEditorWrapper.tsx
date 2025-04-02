"use client";

import "@trycourier/react-editor/styles.css";
import dynamic from "next/dynamic";
// import { ActionPanel } from "./ActionPanel";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const BrandProvider = dynamic(
  () =>
    import("@trycourier/react-editor").then((mod) => {
      const Component = mod.BrandProvider || mod.default?.BrandProvider;
      if (!Component) throw new Error("Could not load BrandProvider");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

const TemplateProvider = dynamic(
  () =>
    import("@trycourier/react-editor").then((mod) => {
      const Component = mod.TemplateProvider || mod.default?.TemplateProvider;
      if (!Component) throw new Error("Could not load TemplateProvider");
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
    <BrandProvider
      tenantId={process.env.NEXT_PUBLIC_TENANT_ID || ""}
      token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
      clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY || ""}
    >
      <TemplateProvider
        templateId={process.env.NEXT_PUBLIC_TEMPLATE_ID || ""}
        tenantId={process.env.NEXT_PUBLIC_TENANT_ID || ""}
        token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
        clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY || ""}
      >
        {/* <ActionPanel /> */}
        <TemplateEditor
          // autoSave={false}
          brandEditor={true}
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
      </TemplateProvider>
    </BrandProvider>
  );
}
