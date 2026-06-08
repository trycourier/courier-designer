import { TranslationEditor } from "@trycourier/react-designer";
import { useMemo, useState } from "react";

const initialEn = "Welcome to our platform, {{user.name}}!";
const initialFr = "Bienvenue sur notre plateforme, {{user.name}} !";

/**
 * Standalone demo for the TranslationEditor component.
 * Editable source (en) and translation (fr) with live Elemental JSON output.
 */
export function TranslationEditorPage() {
  const [enContent, setEnContent] = useState(initialEn);
  const [frContent, setFrContent] = useState(initialFr);

  const textElement = useMemo(
    () => ({
      type: "text",
      content: enContent,
      align: "left",
      locales: frContent.trim()
        ? {
            fr: { content: frContent },
          }
        : undefined,
    }),
    [enContent, frContent]
  );

  return (
    <div>
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#eff6ff",
          borderRadius: "8px",
          border: "1px solid #93c5fd",
        }}
      >
        <strong>TranslationEditor:</strong> Edit the English source and French translation below.
        Select text to open the formatting bubble menu. Variables like{" "}
        <code>{`{{user.name}}`}</code> are preserved.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <section
          style={{
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600 }}>
            Original (en)
          </h3>
          <TranslationEditor
            value={enContent}
            placeholder="Enter English source text..."
            onChange={setEnContent}
          />
        </section>

        <section
          style={{
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600 }}>
            Translation (fr)
          </h3>
          <TranslationEditor
            value={frContent}
            placeholder="Enter French translation..."
            onChange={setFrContent}
          />
        </section>
      </div>

      <section
        style={{
          padding: "16px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600 }}>
          Text element (Elemental JSON)
        </h3>
        <pre
          style={{
            margin: 0,
            fontSize: "12px",
            maxHeight: "400px",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {JSON.stringify(textElement, null, 2)}
        </pre>
      </section>
    </div>
  );
}
