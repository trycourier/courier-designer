"use client";

import "@trycourier/react-designer/styles.css";
import { Navigation } from "../components/Navigation";
import dynamic from "next/dynamic";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
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

export default function TemplateEditorPage() {
  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <Navigation />
      <h1 style={{ marginBottom: "24px", textAlign: "center" }}>Template Editor Demo</h1>
      <div style={{ height: "80vh" }}>
        <TemplateEditor
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
      </div>
    </main>
  );
}
