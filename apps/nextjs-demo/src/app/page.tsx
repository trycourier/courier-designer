"use client";

import dynamic from "next/dynamic";
import "@trycourier/react-editor/styles.css";

const CourierTemplateProvider = dynamic(
  async () => {
    const mod = await import("@trycourier/react-editor");
    const ProviderComponent = mod.CourierTemplateProvider || mod.default?.CourierTemplateProvider;
    if (!ProviderComponent) {
      throw new Error("Could not load CourierTemplateProvider component");
    }
    return ProviderComponent;
  },
  {
    ssr: false,
  }
);

const Editor = dynamic(
  async () => {
    const mod = await import("@trycourier/react-editor");
    const EditorComponent = mod.Editor || mod.default?.Editor;
    if (!EditorComponent) {
      throw new Error("Could not load Editor component");
    }
    return EditorComponent;
  },
  {
    ssr: false,
    loading: () => <div>Loading editor...</div>,
  }
);

export default function Home() {
  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: "24px", textAlign: "center" }}>
        React Editor Next.js Demo
      </h1>
      <div style={{ height: "70vh" }}>
        <CourierTemplateProvider templateId="123" tenantId="456" token="789">
          <Editor
            imageBlockPlaceholder={
              process.env.NEXT_PUBLIC_IMAGE_PLACEHOLDER_URL || ""
            }
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
      </div>
    </main>
  );
}
