"use client";

import "@trycourier/react-designer/styles.css";
import dynamic from "next/dynamic";
<<<<<<< HEAD
import { useCallback, useState } from "react";
import type { ElementalContent } from "@trycourier/react-designer";
import { useTemplateActions } from "@trycourier/react-designer";
=======
import { useState } from "react";
import { ActionPanel } from "./ActionPanel";
import "../globals.css";
>>>>>>> fa816d1 (feat(react-designer): enhance TemplateEditor with sidebar expansion state management and improve layout responsiveness)

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

const defaultValue = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "sms",
      raw: {
        text: "Test SMS 22",
      },
    },
    {
      type: "channel",
      channel: "push",
      raw: {
        title: "",
        text: "Push",
      },
    },
    {
      type: "channel",
      channel: "email",
      elements: [
        {
          type: "meta",
          title: "",
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          text_style: "h1",
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "Hello, world\n",
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "\n",
        },
        {
          width: "1%",
          border: {
            color: "#000000",
            enabled: true,
          },
          type: "image",
          align: "center",
          src: "",
        },
      ],
    },
  ],
};

export function TemplateEditorWrapper() {
  const { saveTemplate } = useTemplateActions();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [value, setValue] = useState(defaultValue);
  // const [value, setValue] = useState();

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

  const onCustomSave = useCallback(
    async (value: ElementalContent) => {
      console.log("onCustomSave", value);
      await saveTemplate();
      // setValue(value);
    },
    [saveTemplate]
  );

  // const routing = useMemo(() => ({
  //   method: "single",
  //   channels: ["email", "sms", "push", "inbox"],
  // }), []);

  return (
    <TemplateEditor
      autoSave={false}
      value={value}
      // onChange={(value) => {
      //   console.log("onChange", value);
      //   setValue(value);
      // }}
      onChange={onCustomSave}
      // routing={routing}
      // hidePublish
      // key={counter}
      brandEditor
      // variables={{
      //   user: {
      //     firstName: "John",
      //     lastName: "Doe",
      //     email: "john@example.com",
      //   },
      //   company: {
      //     name: "Acme Inc",
      //     address: {
      //       street: "123 Main St",
      //       city: "San Francisco",
      //     },
      //   },
      // }}
    />
  );
}
