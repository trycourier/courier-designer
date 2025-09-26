"use client";

import "@trycourier/react-designer/styles.css";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ActionPanel } from "./ActionPanel";

const LoadingComponent = () => (
  <div style={{ padding: 20, textAlign: "center" }}>Loading Courier Editor...</div>
);

const TemplateProvider = dynamic(
  () =>
    import("@trycourier/react-designer").then((mod) => {
      const Component = mod.TemplateProvider;
      if (!Component) throw new Error("Could not load TemplateProvider");
      return Component;
    }),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
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

const TenantIds = [process.env.NEXT_PUBLIC_TENANT_ID || "", "bilbo"];
const TemplateIds = [process.env.NEXT_PUBLIC_TEMPLATE_ID || "", "template2"];

export function TemplateEditorWrapper() {
  const [tenantId, setTenantId] = useState(TenantIds[0]);
  // const [templateId, setTemplateId] = useState(TemplateIds[0]);
  const [templateId, setTemplateId] = useState("template216");
  const [counter, setCounter] = useState(0);

  const [value, setValue] = useState({
    "version": "2022-01-01",
    "elements": [
        {
            "type": "channel",
            "channel": "sms",
            "raw": {
                "text": "Test SMS 22"
            }
        },
        {
            "type": "channel",
            "channel": "push",
            "raw": {
                "title": "",
                "text": "Push"
            }
        },
        {
            "type": "channel",
            "channel": "email",
            "elements": [
                {
                    "type": "meta",
                    "title": ""
                },
                {
                    "border": {
                        "color": "#000000",
                        "enabled": true
                    },
                    "text_style": "h1",
                    "padding": "6px 0px",
                    "color": "#292929",
                    "background_color": "transparent",
                    "type": "text",
                    "align": "left",
                    "content": "Hello, world\n"
                },
                {
                    "border": {
                        "color": "#000000",
                        "enabled": true
                    },
                    "padding": "6px 0px",
                    "color": "#292929",
                    "background_color": "transparent",
                    "type": "text",
                    "align": "left",
                    "content": "\n"
                },
                {
                    "width": "1%",
                    "border": {
                        "color": "#000000",
                        "enabled": true
                    },
                    "type": "image",
                    "align": "center",
                    "src": ""
                }
            ]
        }
    ]
  });

  // const getTemplate = useCallback(async (actions: any) => {
  //   console.log("Custom getTemplate called", actions);
  //   actions.setIsTemplateLoading(false);
  //   return Promise.resolve();
  // }, []);

  // const saveTemplate = useCallback(async (actions: any, options: any) => {
  //   console.log("Custom saveTemplate called", { actions, options });
  //   // DO NOT call setIsTemplateSaving - it will cause infinite loops
  //   // The saving state is managed internally by the system

  //   // Your custom logic here - send data to your API, etc.
  //   // For demo purposes, we'll just resolve after a delay
  //   await new Promise((resolve) => setTimeout(resolve, 1000));
  //   console.log("Save completed!");
  //   return Promise.resolve();
  // }, []);

  // useEffect(() => {
  //   setTimeout(() => {
  //     // setTenantId(TenantIds[1]);
  //     // setTemplateId(TemplateIds[1]);
  //   }, 100);
  // }, []);

  return (
    <>
      <div style={{ padding: 20, display: "flex", flexDirection: "row", gap: 20 }}>
        Tenant:
        <select onChange={(e) => setTenantId(e.target.value)}>
          {TenantIds.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
        Template:
        <select onChange={(e) => setTemplateId(e.target.value)}>
          {TemplateIds.map((id) => (
            <option value={id} key={id}>
              {id}
            </option>
          ))}
        </select>
        Counter: {counter}
        <button onClick={() => setCounter(counter + 1)}>Increment</button>
      </div>
      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={process.env.NEXT_PUBLIC_JWT_TOKEN || ""}
        // token={"123"}
        // getTemplate={getTemplate}
        // saveTemplate={saveTemplate}
      >
        <ActionPanel />
        <TemplateEditor
          // autoSave={false}
          // value={value}
          onChange={(value) => {
            console.log("onChange", value);
            setValue(value);
          }}
          routing={{
            method: "single",
            channels: ["email", "sms", "push", "inbox"],
          }}
          // hidePublish
          // key={counter}
          brandEditor
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
      </TemplateProvider>
    </>
  );
}
