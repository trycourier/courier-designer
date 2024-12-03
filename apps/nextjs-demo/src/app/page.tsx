"use client";

import dynamic from "next/dynamic";
import "@trycourier/react-editor/styles.css";

const Editor = dynamic(
  () => import("@trycourier/react-editor").then((mod) => mod.Editor),
  {
    ssr: false, // This will disable server-side rendering for this component
    loading: () => <div>Loading editor...</div>,
  }
);

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
