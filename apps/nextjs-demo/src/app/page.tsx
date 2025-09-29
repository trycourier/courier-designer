export const dynamic = "force-dynamic";
export const runtime = "edge";

import { TemplateProviderWrapper } from "./components/TemplateProviderWrapper";
import { Navigation } from "./components/Navigation";

export default function Home() {
  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <Navigation />
      </div>
      {/* <h1 style={{ marginBottom: "24px", textAlign: "center" }}>React Editor Next.js Demo</h1> */}
      <div style={{ flexGrow: 1 }}>
        <TemplateProviderWrapper />
      </div>
    </main>
  );
}
