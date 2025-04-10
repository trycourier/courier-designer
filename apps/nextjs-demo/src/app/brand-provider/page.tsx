"use client";

import { Navigation } from "../components/Navigation";
import dynamic from "next/dynamic";

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

export default function BrandProviderPage() {
  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <Navigation />
      <h1 style={{ marginBottom: "24px", textAlign: "center" }}>Brand Provider Demo</h1>
      <div style={{ padding: 20 }}>
        <BrandProvider
          apiUrl={process.env.NEXT_PUBLIC_API_URL || ""}
          tenantId={process.env.NEXT_PUBLIC_TENANT_ID || ""}
          token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
          clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY || ""}
        >
          <div style={{ padding: 20, background: "#f5f5f5", borderRadius: 10 }}>
            <h3>Brand Provider Context</h3>
            <p>Brand data is loaded and available in the context.</p>
          </div>
        </BrandProvider>
      </div>
    </main>
  );
} 