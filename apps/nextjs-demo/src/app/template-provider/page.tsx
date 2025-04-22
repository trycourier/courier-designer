"use client";

import "@trycourier/react-designer/styles.css";
import { Navigation } from "../components/Navigation";
import dynamic from "next/dynamic";
import { useState } from "react";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const TemplateProvider = dynamic(
  () =>
    import("@trycourier/react-designer").then((mod) => {
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
    import("@trycourier/react-designer").then((mod) => {
      const Component = mod.TemplateEditor || mod.default?.TemplateEditor;
      if (!Component) throw new Error("Could not load TemplateEditor");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

const TenantIds = [process.env.NEXT_PUBLIC_TENANT_ID || "", "bilbo"];
const TemplateIds = [process.env.NEXT_PUBLIC_TEMPLATE_ID || "", "template2"];

export default function TemplateEditorPage() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);
  const now = new Date().getTime();

  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <Navigation />
      <div style={{ height: "80vh" }}>
        <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
          Tenant:
          <select onChange={(e) => setTenantId(e.target.value)}>
            {TenantIds.map((id) => (
              <option value={id} key={id}>
                {id}
              </option>
            ))}
          </select>
          Template:
          <select onChange={(e) => setTemplateId(e.target.value)}>
            {TemplateIds.map((id) => (
              <option value={id} key={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <TemplateProvider
          key={`provider-${now}`}
          apiUrl={process.env.NEXT_PUBLIC_API_URL || ""}
          templateId={templateId}
          tenantId={tenantId}
          token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
          clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY || ""}
        >
          <TemplateEditor
            key={`editor-${now}`}
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
      </div>
    </main>
  );
}
