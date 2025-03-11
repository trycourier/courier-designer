"use client";

import { useCourierTemplate } from "@trycourier/react-editor";

export const ActionPanel = () => {
  const { saveTemplate, publishTemplate } = useCourierTemplate();

  const handleSaveTemplate = async () => {
    await saveTemplate();
  };

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
          backgroundColor: "green",
          color: "white",
          padding: 10,
          borderRadius: 5,
        }}
        onClick={handleSaveTemplate}
      >
        Save
      </button>
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
