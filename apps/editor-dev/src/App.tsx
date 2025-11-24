// import type { ElementalContent } from "@trycourier/react-designer";
import {
  TemplateProvider,
  TemplateEditor,
  useTemplateActions,
  // useBrandActions,
} from "@trycourier/react-designer";
import "./style.css";
import "@trycourier/react-designer/styles.css";
// import { useCallback, useState, useEffect } from "react";
import { useState } from "react";
// import type { ElementalContent } from "@trycourier/react-designer";

const TenantIds = [import.meta.env.VITE_TENANT_ID || "test-tenant", "frodo"];
const TemplateIds = [import.meta.env.VITE_TEMPLATE_ID || "test-template", "dev-12"];

// const allowedChannels = ["email", "sms", "push", "inbox"];

// const tempData: ElementalContent = {
//   version: "2022-01-01",
//   elements: [
//     {
//       type: "channel",
//       channel: "sms",
//       elements: [
//         {
//           type: "text",
//           content: "Your SMS message content here",
//         },
//       ],
//     },
//     {
//       type: "channel",
//       channel: "push",
//       elements: [
//         {
//           type: "meta",
//           title: "Test",
//         },
//         {
//           type: "text",
//           content: "Test edit T TTest push content Test editT Test edit",
//         },
//       ],
//     },
//     {
//       type: "channel",
//       channel: "inbox",
//       elements: [
//         {
//           type: "meta",
//           title: "Test",
//         },
//         {
//           type: "text",
//           content: "fhfgh\n",
//         },
//         {
//           href: "",
//           type: "action",
//           align: "left",
//           content: "Register1",
//         },
//       ],
//       locales: {
//         "eu-fr": {
//           content: "Ceci est un paragraphe avec des locales\n",
//         },
//       },
//     },
//     {
//       type: "channel",
//       channel: "email",
//       elements: [
//         {
//           type: "meta",
//           title: "Test subject line",
//         },
//         {
//           border: {
//             color: "#000000",
//             enabled: true,
//           },
//           padding: "6px 0px",
//           color: "#292929",
//           background_color: "transparent",
//           type: "text",
//           align: "left",
//           content: "This is a paragraph with locales\n",
//           locales: {
//             "eu-fr": {
//               content: "Ceci est un paragraphe avec des locales\n",
//             },
//             "es-es": {
//               content: "Este es un párrafo con configuraciones regionales\n",
//             },
//           },
//         },
//         {
//           type: "text",
//           align: "left",
//           content: "This is **bold** text with locales\n",
//           text_style: "h1",
//           locales: {
//             "eu-fr": {
//               content: "C'est du texte **gras** avec des locales\n",
//             },
//           },
//         },
//         {
//           type: "action",
//           content: "Click here",
//           href: "https://example.com",
//           align: "center",
//           background_color: "#0085FF",
//           color: "#ffffff",
//           locales: {
//             "eu-fr": {
//               content: "Cliquez ici",
//               href: "https://exemple.fr",
//             },
//           },
//         },
//         {
//           type: "quote",
//           content: "This is a quote with locales",
//           locales: {
//             "eu-fr": {
//               content: "Ceci est une citation avec des locales",
//             },
//           },
//         },
//         {
//           type: "image",
//           src: "https://via.placeholder.com/600x200",
//           alt_text: "Placeholder image",
//           locales: {
//             "eu-fr": {
//               src: "https://via.placeholder.com/600x200?text=Image+FR",
//             },
//           },
//         },
//         {
//           type: "html",
//           content: "<div>Custom HTML content</div>",
//           locales: {
//             "eu-fr": {
//               content: "<div>Contenu HTML personnalisé</div>",
//             },
//           },
//         },
//       ],
//     },
//     {
//       type: "channel",
//       channel: "slack",
//       elements: [
//         {
//           border: {
//             color: "#000000",
//             enabled: true,
//           },
//           padding: "6px",
//           background_color: "#0085FF",
//           color: "#ffffff",
//           href: "",
//           type: "action",
//           align: "center",
//           content: "Button",
//         },
//         {
//           border: {
//             color: "#000000",
//             enabled: true,
//           },
//           padding: "6px 0px",
//           color: "#292929",
//           background_color: "transparent",
//           type: "text",
//           align: "left",
//           content: "hfgjfrgjrghjfghj frghj fghkjfhjrk hjk ghjkhjkghjk ghjkgh jkghjk ghjk hjkgh\n",
//         },
//         {
//           border: {
//             color: "#000000",
//             enabled: true,
//           },
//           padding: "6px 0px",
//           color: "#292929",
//           background_color: "transparent",
//           type: "text",
//           align: "left",
//           content: "hfhfghfg\n",
//         },
//         {
//           padding: "6px",
//           type: "divider",
//           width: "1px",
//           color: "#000000",
//         },
//       ],
//     },
//     {
//       type: "channel",
//       channel: "msteams",
//       elements: [
//         {
//           border: {
//             color: "#000000",
//             enabled: true,
//           },
//           padding: "6px 0px",
//           color: "#292929",
//           background_color: "transparent",
//           type: "text",
//           align: "left",
//           content: "fghfghfghfghf\n",
//         },
//         {
//           padding: "6px",
//           type: "divider",
//           width: "1px",
//           color: "#000000",
//         },
//         {
//           border: {
//             color: "#000000",
//             enabled: true,
//           },
//           padding: "6px 0px",
//           color: "#292929",
//           background_color: "transparent",
//           type: "text",
//           align: "left",
//           content: "\n",
//         },
//       ],
//     },
//   ],
// };

const BasicApp = () => {
  const { templateError } = useTemplateActions();
  if (templateError) {
    console.log("[App] Template error:", templateError.message, templateError);
  }

  // console.log({ templateEditorContent });

  return (
    <TemplateEditor
      // autoSave={false}
      // value={tempData}
      colorScheme="dark"
      // onChange={onCustomSave}
      routing={{
        method: "single",
        channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
      }}
    />
  );
};

// const CustomHooksApp = () => {
//   const { saveTemplate, setContentTransformer } = useTemplateActions();

//   // Register content transformer on mount
//   useEffect(() => {
//     // IMPORTANT: Wrap the transformer function to prevent Jotai from treating it as an updater function
//     const transformerFunction = (content: ElementalContent): ElementalContent => {
//       // Safety checks
//       if (!content || !content.elements) {
//         return content;
//       }

//       // Add test locales to all text elements
//       return {
//         ...content,
//         elements: content.elements?.map((el: any) => {
//           if (el.type === "channel") {
//             return {
//               ...el,
//               elements: el.elements?.map((child: any) => {
//                 if (child.type === "text" && child.content) {
//                   return {
//                     ...child,
//                     locales: {
//                       ...(child.locales || {}),
//                       "eu-fr": { content: `[FR] ${child.content}` },
//                       "es-es": { content: `[ES] ${child.content}` },
//                     },
//                   };
//                 }
//                 return child;
//               }),
//             };
//           }
//           return el;
//         }),
//       };
//     };

//     // Set the transformer by wrapping it to avoid Jotai updater function behavior
//     setContentTransformer(() => transformerFunction);

//     return () => {
//       setContentTransformer(null);
//     };
//   }, [setContentTransformer]);

//   const onCustomSave = useCallback(
//     async (value: ElementalContent) => {
//       console.log("onCustomSave - Content with locales:", value);
//       await saveTemplate();
//     },
//     [saveTemplate]
//   );

//   return (
//     <TemplateEditor
//       autoSave={false}
//       // value={tempData}
//       onChange={onCustomSave}
//       routing={{
//         method: "single",
//         channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
//       }}
//       variables={{
//         user: {
//           firstName: "John",
//           lastName: "Doe",
//           email: "john@example.com",
//         },
//         products: {
//           item1: "Item 1",
//         },
//         company: {
//           name: "Acme Inc",
//           address: {
//             street: "123 Main St",
//             city: "San Francisco",
//           },
//         },
//       }}
//     />
//   );
// };

function App() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  const [templateId, setTemplateId] = useState(TemplateIds[0]);
  // const { publishTemplate } = useTemplateActions();
  const [count, setCount] = useState(0);

  // const isLoading = false;
  // const { publishBrand } = useBrandActions()

  // useEffect(() => {
  //   setTimeout(() => {
  //     // setTenantId(TenantIds[1]);
  //     // setTemplateId(TemplateIds[1]);
  //   }, 100);
  // }, []);

  // const handlePublishTemplate = async () => {
  //   await publishTemplate();
  // };

  return (
    <div style={{ minWidth: "800px", width: "70%", height: "90%", margin: "0 auto" }}>
      {/* <div className="bg-red-500 text-white p-4 text-center">
        Tailwind Test - This should be red background with white text
      </div> */}
      <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
        Tenant:
        <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          {TenantIds.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
        Template:
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {TemplateIds.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
        Count: {count}
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
      {/* <div style={{ display: "flex", flexDirection: "row", gap: 20, justifyContent: "center" }}>
        <button onClick={handlePublishTemplate}>Publish</button>
      </div> */}

      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN || "test-token"}
        apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
        // uploadImage={() => {
        //   console.log("uploadImage called");
        //   return Promise.resolve({ url: "https://www.google.com" });
        // }}
      >
        <BasicApp />
        {/* <CustomHooksApp /> */}
      </TemplateProvider>
    </div>
  );
}

export default App;
