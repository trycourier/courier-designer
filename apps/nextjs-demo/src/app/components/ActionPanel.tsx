"use client";

import { useCourierTemplate } from "@trycourier/react-editor";

export const ActionPanel = () => {
  const { saveTemplate } = useCourierTemplate();

  const handleSaveTemplate = async () => {
    const response = await saveTemplate();
    console.log("save template response", response);
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={handleSaveTemplate}>Save Template</button>
    </div>
  );
};
