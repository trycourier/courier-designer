"use client";

import dynamic from "next/dynamic";
import "@trycourier/courier-editor/styles.css";

const Editor = dynamic(
  async () => {
    const mod = await import("@trycourier/courier-editor");
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
        <Editor
          imageBlockPlaceholder={
            process.env.NEXT_PUBLIC_IMAGE_PLACEHOLDER_URL || ""
          }
        />
      </div>
    </main>
  );
}
