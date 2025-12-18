import { TemplateEditor, useTemplateActions, useBlockConfig } from "@trycourier/react-designer";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ExternalLink, ClipboardList } from "lucide-react";
import type { LayoutContext } from "./Layout";

/**
 * Demo showing custom block presets and template duplication functionality.
 */
export function CustomElementsPage() {
  const { templateId, handleTemplateCreated } = useOutletContext<LayoutContext>();
  const { templateError, duplicateTemplate, isTemplateSaving } = useTemplateActions();
  const { visibleBlocks, setVisibleBlocks, setDefaults, registerPreset } = useBlockConfig();
  const [newTemplateId, setNewTemplateId] = useState(`${templateId}-copy`);
  const [duplicateResult, setDuplicateResult] = useState<string | null>(null);

  // Update suggested name when template changes
  useEffect(() => {
    setNewTemplateId(`${templateId}-copy`);
    setDuplicateResult(null);
  }, [templateId]);

  // Quick duplicate - uses auto-generated name ({templateId}-copy)
  const handleQuickDuplicate = async () => {
    setDuplicateResult(null);
    try {
      const result = await duplicateTemplate();
      if (result?.success) {
        setDuplicateResult(
          `✅ Success! Template duplicated to "${result.templateId}" (version: ${result.version})`
        );
        handleTemplateCreated(result.templateId);
      } else {
        setDuplicateResult(`❌ Failed to duplicate template`);
      }
    } catch {
      setDuplicateResult(`❌ Network error: Failed to duplicate template`);
    }
  };

  // Custom duplicate - uses user-provided name
  const handleCustomDuplicate = async () => {
    if (!newTemplateId.trim()) {
      setDuplicateResult("Error: Please enter a new template ID");
      return;
    }
    if (newTemplateId.trim() === templateId) {
      setDuplicateResult("Error: New template ID must be different from the current one");
      return;
    }
    setDuplicateResult(null);
    try {
      const result = await duplicateTemplate({
        targetTemplateId: newTemplateId.trim(),
      });
      if (result?.success) {
        setDuplicateResult(
          `✅ Success! Template duplicated to "${result.templateId}" (version: ${result.version})`
        );
        handleTemplateCreated(result.templateId);
      } else {
        setDuplicateResult(`❌ Failed to duplicate template`);
      }
    } catch {
      setDuplicateResult(`❌ Network error: Failed to duplicate template`);
    }
  };

  useEffect(() => {
    // 1. Register presets
    registerPreset({
      type: "button",
      key: "portal",
      label: "Go to Portal",
      icon: <ExternalLink className="courier-w-5 courier-h-5" />,
      attributes: {
        link: "https://portal.example.com",
        label: "Go to Portal",
        backgroundColor: "#007bff",
      },
    });

    registerPreset({
      type: "button",
      key: "survey",
      label: "Take Survey",
      icon: <ClipboardList className="courier-w-5 courier-h-5" />,
      attributes: {
        link: "https://survey.example.com",
        label: "Take Survey",
        backgroundColor: "#28a745",
      },
    });

    // 2. Set defaults for buttons
    setDefaults("button", { borderRadius: 4 });

    // 3. Set visible blocks with presets
    setVisibleBlocks([
      "heading",
      "text",
      { type: "button", preset: "portal" },
      "image",
      "button",
      { type: "button", preset: "survey" },
    ]);
  }, [setVisibleBlocks, setDefaults, registerPreset]);

  console.log({ visibleBlocks });

  if (templateError) {
    console.log("[CustomElementsPage] Template error:", templateError.message, templateError);
  }

  return (
    <div>
      {/* Duplicate Template UI */}
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 500 }}>Duplicate "{templateId}":</span>
        <button
          onClick={handleQuickDuplicate}
          disabled={isTemplateSaving === true}
          style={{
            padding: "6px 16px",
            borderRadius: "4px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            cursor: isTemplateSaving ? "not-allowed" : "pointer",
            opacity: isTemplateSaving ? 0.6 : 1,
          }}
        >
          {isTemplateSaving ? "Duplicating..." : "Quick Duplicate"}
        </button>
        <span style={{ color: "#666" }}>or</span>
        <input
          type="text"
          value={newTemplateId}
          onChange={(e) => setNewTemplateId(e.target.value)}
          placeholder="Custom template ID"
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            minWidth: "180px",
          }}
        />
        <button
          onClick={handleCustomDuplicate}
          disabled={isTemplateSaving === true}
          style={{
            padding: "6px 16px",
            borderRadius: "4px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: isTemplateSaving ? "not-allowed" : "pointer",
            opacity: isTemplateSaving ? 0.6 : 1,
          }}
        >
          Duplicate
        </button>
        {duplicateResult && (
          <span
            style={{
              fontSize: "14px",
              color: duplicateResult.startsWith("✅") ? "#28a745" : "#dc3545",
            }}
          >
            {duplicateResult}
          </span>
        )}
      </div>

      <TemplateEditor
        routing={{
          method: "single",
          channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
        }}
      />
    </div>
  );
}
