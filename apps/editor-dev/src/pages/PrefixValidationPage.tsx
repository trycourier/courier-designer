import { TemplateEditor } from "@trycourier/react-designer";
import type { VariableValidationConfig } from "@trycourier/react-designer";

const VARIABLES = {
  profile: { email: "" },
  data: { name: "", order_id: "" },
  context: { tenant_id: "", locale: "" },
};

const VALID_PREFIXES = ["profile.", "data.", "context."];

function validateVariable(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const hasValidPrefix = VALID_PREFIXES.some((p) => trimmed.startsWith(p));
  if (!hasValidPrefix) return false;
  const prefix = VALID_PREFIXES.find((p) => trimmed.startsWith(p))!;
  return trimmed.length > prefix.length;
}

const variableValidation: VariableValidationConfig = {
  validate: validateVariable,
  onInvalid: "mark",
  overrideFormatValidation: true,
  invalidMessage: (name) =>
    `"${name}" must start with profile., data., or context. and include a field name`,
};

export function PrefixValidationPage() {
  return (
    <div>
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: "#e8f4fd",
          borderRadius: "8px",
          border: "1px solid #b3d7f5",
        }}
      >
        <strong>Prefix Validation:</strong> Variables must start with <code>profile.</code>,{" "}
        <code>data.</code>, or <code>context.</code> and include a field name. Try{" "}
        <code>{`{{foo}}`}</code>, <code>{`{{data.}}`}</code>, or <code>{`{{data.name}}`}</code>.
      </div>

      <TemplateEditor
        variables={VARIABLES}
        disableVariablesAutocomplete
        variableValidation={variableValidation}
        routing={{ method: "single", channels: ["email"] }}
      />
    </div>
  );
}
