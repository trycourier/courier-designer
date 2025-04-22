"use client";

import "@trycourier/react-designer/styles.css";
import { Navigation } from "../components/Navigation";
import dynamic from "next/dynamic";

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

export default function BrandEditorPage() {
  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <Navigation />
      <h1 style={{ marginBottom: "24px", textAlign: "center" }}>Brand Editor Demo</h1>
      <div style={{ height: "80vh" }}>
        <BrandProvider
          apiUrl={process.env.NEXT_PUBLIC_API_URL || ""}
          tenantId={process.env.NEXT_PUBLIC_TENANT_ID || ""}
          token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
          clientKey={process.env.NEXT_PUBLIC_CLIENT_KEY || ""}
        >
          <BrandEditor />
        </BrandProvider>
      </div>
    </main>
  );
}
