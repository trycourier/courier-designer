"use client";

import { Editor } from "@trycourier/react-editor";
import "@trycourier/react-editor/styles.css";

export default function Home() {
  return (
    <main style={{ padding: "40px" }}>
      <h1 style={{ marginBottom: "24px", textAlign: "center" }}>
        React Editor Next.js Demo
      </h1>
      <div>
        <Editor />
      </div>
    </main>
  );
}
