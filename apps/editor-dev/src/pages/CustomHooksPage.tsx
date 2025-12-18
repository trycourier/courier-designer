import { TemplateEditor, useTemplateActions } from "@trycourier/react-designer";
import type { ElementalContent } from "@trycourier/react-designer";
import { useCallback, useEffect } from "react";

/**
 * Demo showing content transformer and custom save functionality.
 * The transformer automatically adds locales to all text elements.
 */
export function CustomHooksPage() {
  const { saveTemplate, setContentTransformer } = useTemplateActions();

  // Register content transformer on mount
  useEffect(() => {
    // Content transformer that adds test locales to all text elements
    const transformerFunction = (content: ElementalContent): ElementalContent => {
      if (!content || !content.elements) {
        return content;
      }

      return {
        ...content,
        elements: content.elements?.map((el: any) => {
          if (el.type === "channel") {
            return {
              ...el,
              elements: el.elements?.map((child: any) => {
                if (child.type === "text" && child.content) {
                  return {
                    ...child,
                    locales: {
                      ...(child.locales || {}),
                      "eu-fr": { content: `[FR] ${child.content}` },
                      "es-es": { content: `[ES] ${child.content}` },
                    },
                  };
                }
                return child;
              }),
            };
          }
          return el;
        }),
      };
    };

    // Wrap the transformer to avoid Jotai updater function behavior
    setContentTransformer(() => transformerFunction);

    return () => {
      setContentTransformer(null);
    };
  }, [setContentTransformer]);

  const onCustomSave = useCallback(
    async (value: ElementalContent) => {
      console.log("onCustomSave - Content with locales:", value);
      await saveTemplate();
    },
    [saveTemplate]
  );

  return (
    <div>
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#e7f5ff",
          borderRadius: "8px",
          border: "1px solid #74c0fc",
        }}
      >
        <strong>Content Transformer Active:</strong> All text elements will automatically get French
        and Spanish locale translations added when saved.
      </div>

      <TemplateEditor
        autoSave={false}
        onChange={onCustomSave}
        routing={{
          method: "single",
          channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
        }}
      />
    </div>
  );
}
