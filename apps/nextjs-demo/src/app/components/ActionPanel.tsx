"use client";

import { useTemplateActions } from "@trycourier/react-editor";

export const ActionPanel = () => {
  const { publishTemplate } = useTemplateActions();

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
    </div>
  );
};
