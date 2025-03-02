"use client";

import dynamic from "next/dynamic";
import "@trycourier/react-editor/styles.css";
import { useCourierTemplate } from "@trycourier/react-editor";

const CourierTemplateProvider = dynamic(
  async () => {
    const mod = await import("@trycourier/react-editor");
    const ProviderComponent =
      mod.CourierTemplateProvider || mod.default?.CourierTemplateProvider;
    if (!ProviderComponent) {
      throw new Error("Could not load CourierTemplateProvider component");
    }
    return ProviderComponent;
  },
  {
    ssr: false,
  }
);

const CourierEditor = dynamic(
  async () => {
    const mod = await import("@trycourier/react-editor");
    const EditorComponent = mod.CourierEditor || mod.default?.CourierEditor;
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

const ActionPanel = () => {
  const { saveTemplate } = useCourierTemplate();

  const handleSaveTemplate = async () => {
    const response = await saveTemplate("123");
    console.log("save template response", response);
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={handleSaveTemplate}>Save Template</button>
    </div>
  )
}

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
      <div style={{ height: "80vh" }}>
        <CourierTemplateProvider templateId="123" tenantId="456" token="789" apiUrl={process.env.NEXT_PUBLIC_API_URL}>
          <ActionPanel />
          <CourierEditor
            autoSave={false}
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
