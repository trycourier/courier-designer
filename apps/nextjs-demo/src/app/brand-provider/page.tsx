"use client";

import "@trycourier/react-designer/styles.css";
import { Navigation } from "../components/Navigation";
import dynamic from "next/dynamic";
import { useState } from "react";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const BrandProvider = dynamic(
  () =>
    import("@trycourier/react-designer").then((mod) => {
      const Component = mod.BrandProvider || mod.default?.BrandProvider;
      if (!Component) throw new Error("Could not load BrandProvider");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

const BrandEditor = dynamic(
  () =>
    import("@trycourier/react-designer").then((mod) => {
      const Component = mod.BrandEditor || mod.default?.BrandEditor;
      if (!Component) throw new Error("Could not load BrandEditor");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

const TenantIds = [process.env.NEXT_PUBLIC_TENANT_ID || "", "bilbo"];

export default function TemplateEditorPage() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
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
        </div>
        <BrandProvider
          key={`provider-${now}`}
          apiUrl={process.env.NEXT_PUBLIC_API_URL || ""}
          tenantId={tenantId}
          token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
          clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY || ""}
        >
          <BrandEditor
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
        </BrandProvider>
      </div>
    </main>
  );
}
