"use client";

import { useTemplateActions } from "@trycourier/react-designer";

export const ActionPanel = () => {
  const { publishTemplate, setTemplateError, templateError } = useTemplateActions();

  const handlePublishTemplate = async () => {
    await publishTemplate();
  };

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "row",
        gap: 20,
        justifyContent: "center",
      }}
    >
      <button
        style={{
          backgroundColor: "blue",
          color: "white",
          padding: 10,
          borderRadius: 5,
        }}
        onClick={handlePublishTemplate}
      >
        Publish
      </button>
      <button
        style={{
          backgroundColor: "red",
          color: "white",
          padding: 10,
          borderRadius: 5,
        }}
        onClick={() => {
          setTemplateError("custom error");
        }}
      >
        Error: {templateError ? (typeof templateError === 'string' ? templateError : templateError.message) : "None"}
      </button>
    </div>
  );
};
