import { TemplateEditor, useTemplateActions } from "@trycourier/react-designer";

const initialValue = {
  version: "2022-01-01" as const,
  elements: [
    {
      type: "channel" as const,
      channel: "email" as const,
      elements: [
        {
          type: "meta" as const,
          title: "Welcome Email Test Template",
        },
        {
          type: "text" as const,
          align: "left" as const,
          color: "#292929",
          border: {
            color: "#000000",
            enabled: false,
          },
          content: "Hello {{user.firstName}}!",
          padding: "6px 0px",
          background_color: "transparent",
        },
      ],
    },
  ],
};

/**
 * Demo showing controlled value mode with the TemplateEditor.
 * The value is passed in and onChange is called when content changes.
 */
export function ControlledValuePage() {
  const { templateEditorContent } = useTemplateActions();

  console.log("templateEditorContent", templateEditorContent);

  return (
    <div>
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#fff3cd",
          borderRadius: "8px",
          border: "1px solid #ffc107",
        }}
      >
        <strong>Controlled Mode:</strong> This editor uses a preset initial value and autoSave is
        disabled. Check the console to see the onChange events.
      </div>

      <TemplateEditor
        autoSave={false}
        value={initialValue}
        onChange={(value) => {
          console.log("onChange - value:", value);
        }}
      />
    </div>
  );
}
