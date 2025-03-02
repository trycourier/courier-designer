export const dynamic = "force-dynamic";
export const runtime = "edge";

import { CourierEditorWrapper } from "./components/CourierEditorWrapper";

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
        <CourierEditorWrapper />
      </div>
    </main>
  );
}
