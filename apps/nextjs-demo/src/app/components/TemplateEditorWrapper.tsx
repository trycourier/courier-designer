"use client";

import "@trycourier/react-designer/styles.css";
import dynamic from "next/dynamic";
import "../globals.css";
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
          channels: ["email", "sms", "push", "inbox"],
        }}
        // hidePublish
        // key={counter}
        // className="template-editor-wrapper"
        brandEditor
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
    </>
  );
}
