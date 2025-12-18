import { TemplateEditor } from "@trycourier/react-designer";
import type { VariableValidationConfig } from "@trycourier/react-designer";
import { useState } from "react";

// Predefined list of allowed variables (nested object for autocomplete)
const VARIABLES = {
  user: {
    firstName: "",
    lastName: "",
    email: "",
  },
  order: {
    id: "",
    total: "",
    date: "",
  },
  company: {
    name: "",
    address: "",
  },
};

// Flattened list for validation
const ALLOWED_VARIABLES = [
  "user.firstName",
  "user.lastName",
  "user.email",
  "order.id",
  "order.total",
  "order.date",
  "company.name",
  "company.address",
];

/**
 * Demo showing custom variable validation AND autocomplete functionality.
 * - Autocomplete: When you type {{, a dropdown shows matching variables
 * - Validation: Variables not in the allowed list are marked as invalid
 */
export function VariableValidationPage() {
  const [onInvalidBehavior, setOnInvalidBehavior] = useState<"mark" | "remove">("mark");
  const [showToast, setShowToast] = useState(true);
  const [overrideFormat, setOverrideFormat] = useState(false);
  // Default to false so E2E tests can work with the editable chip flow
  // This can be toggled via the checkbox to test autocomplete behavior
  const [enableAutocomplete, setEnableAutocomplete] = useState(false);

  // Build the validation config based on current settings
  const variableValidation: VariableValidationConfig = {
    validate: (name) => ALLOWED_VARIABLES.includes(name),
    onInvalid: onInvalidBehavior,
    invalidMessage: showToast
      ? (name) => `Variable "${name}" is not allowed. Available: ${ALLOWED_VARIABLES.join(", ")}`
      : undefined,
    overrideFormatValidation: overrideFormat,
  };

  return (
    <div>
      {/* Configuration Panel */}
      <div
        style={{
          padding: "16px",
          marginBottom: "16px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 600 }}>
          Variable Autocomplete & Validation Settings
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Allowed Variables */}
          <div>
            <strong>Allowed Variables:</strong>
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              {ALLOWED_VARIABLES.map((v) => (
                <code
                  key={v}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#e7f5ff",
                    borderRadius: "4px",
                    fontSize: "13px",
                    color: "#1971c2",
                  }}
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>

          {/* Settings Row */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Enable Autocomplete */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                backgroundColor: enableAutocomplete ? "#d3f9d8" : "#ffe3e3",
                padding: "4px 10px",
                borderRadius: "4px",
              }}
            >
              <input
                type="checkbox"
                checked={enableAutocomplete}
                onChange={(e) => setEnableAutocomplete(e.target.checked)}
              />
              <span>
                {enableAutocomplete ? "✓ Autocomplete enabled" : "✗ Autocomplete disabled"}
              </span>
            </label>

            {/* onInvalid Behavior */}
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>On Invalid:</span>
              <select
                value={onInvalidBehavior}
                onChange={(e) => setOnInvalidBehavior(e.target.value as "mark" | "remove")}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                }}
              >
                <option value="mark">Mark as invalid (red styling)</option>
                <option value="remove">Remove the chip</option>
              </select>
            </label>

            {/* Show Toast */}
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showToast}
                onChange={(e) => setShowToast(e.target.checked)}
              />
              <span>Show toast message on invalid</span>
            </label>

            {/* Override Format Validation */}
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={overrideFormat}
                onChange={(e) => setOverrideFormat(e.target.checked)}
              />
              <span>Override format validation</span>
            </label>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#d3f9d8",
          borderRadius: "8px",
          border: "1px solid #69db7c",
        }}
      >
        <strong>Try it:</strong> Type <code>{`{{`}</code> in the editor.
        {enableAutocomplete
          ? " A dropdown will appear with matching variables. Select one or type a custom name."
          : " An editable chip will appear where you can type any variable name."}{" "}
        Invalid variables will be handled according to the "On Invalid" setting.
      </div>

      <TemplateEditor
        variables={enableAutocomplete ? VARIABLES : undefined}
        disableVariablesAutocomplete={!enableAutocomplete}
        variableValidation={variableValidation}
        routing={{
          method: "single",
          channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
        }}
      />
    </div>
  );
}
