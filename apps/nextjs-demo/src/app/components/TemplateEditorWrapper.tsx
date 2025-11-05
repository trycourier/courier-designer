"use client";

import "@trycourier/react-designer/styles.css";
import dynamic from "next/dynamic";
import "../globals.css";
import { useVariables } from "@trycourier/react-designer";
// import { EmailEditor, convertElementalToTiptap } from "@trycourier/react-designer";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const TemplateEditor = dynamic(
  () =>
    import("@trycourier/react-designer").then((mod) => {
      const Component = mod.TemplateEditor;
      if (!Component) throw new Error("Could not load TemplateEditor");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

// const actualContent = {
//   content: {
//     version: "2022-01-01",
//     elements: [
//       // {
//       //     "type": "channel",
//       //     "channel": "sms",
//       //     "raw": {
//       //         "text": "Test SMS 22{{"
//       //     }
//       // },
//       // {
//       //     "type": "channel",
//       //     "channel": "push",
//       //     "raw": {
//       //         "title": "",
//       //         "text": "Push"
//       //     }
//       // },
//       {
//         type: "channel",
//         channel: "email",
//         elements: [
//           {
//             type: "meta",
//             title: "Subject 1",
//           },
//           {
//             border: {
//               color: "#000000",
//               enabled: true,
//             },
//             text_style: "h1",
//             padding: "6px 0px",
//             color: "#292929",
//             background_color: "transparent",
//             type: "text",
//             align: "left",
//             content: "Header\n",
//           },
//           {
//             border: {
//               color: "#000000",
//               enabled: true,
//             },
//             padding: "6px 0px",
//             color: "#292929",
//             background_color: "transparent",
//             type: "text",
//             align: "left",
//             content: "aaa\n",
//           },
//         ],
//       },
//     ],
//   },
// };

function VariablesDisplay() {
  const { usedVariables, variableValues, addVariableValue } = useVariables();

  return (
    <>
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
          Variables Editor ({usedVariables.length})
        </h3>

        {usedVariables.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "12px",
              alignItems: "center",
            }}
          >
            {usedVariables.map((variable) => (
              <>
                <label
                  key={`label-${variable}`}
                  htmlFor={`var-${variable}`}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#333",
                  }}
                >
                  {variable}
                </label>
                <input
                  key={`input-${variable}`}
                  id={`var-${variable}`}
                  type="text"
                  value={variableValues[variable] || ""}
                  onChange={(e) => addVariableValue(variable, e.target.value)}
                  placeholder={`Enter value for ${variable}`}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "sans-serif",
                  }}
                />
              </>
            ))}
          </div>
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            No variables used in current channel. Type <code>{"{{"}</code> in the editor to add
            variables.
          </p>
        )}
      </div>

      {/* Variables Logger */}
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          backgroundColor: "#1e1e1e",
          borderRadius: "8px",
          border: "1px solid #333",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#fff" }}>Variables Logger</h3>
        <pre
          style={{
            margin: 0,
            padding: "16px",
            backgroundColor: "#2d2d2d",
            borderRadius: "4px",
            color: "#d4d4d4",
            fontFamily: "Consolas, Monaco, 'Courier New', monospace",
            fontSize: "13px",
            overflowX: "auto",
            lineHeight: "1.5",
          }}
        >
          {JSON.stringify(variableValues, null, 2)}
        </pre>
      </div>
    </>
  );
}

export function TemplateEditorWrapper() {
  return (
    <>
      {/* <EmailEditor
        value={convertElementalToTiptap(actualContent.content)}
        readOnly
        // variables={variables}
      /> */}
      <TemplateEditor
        // dataMode="dark"
        routing={{
          method: "single",
          channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
        }}
        // hidePublish
        // key={counter}
        // className="template-editor-wrapper"
        // brandEditor
        variables={{
          user: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          },
          products: {
            item1: "Item 1",
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
      <VariablesDisplay />
    </>
  );
}
