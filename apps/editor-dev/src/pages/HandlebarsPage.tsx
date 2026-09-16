import { TemplateEditor } from "@trycourier/react-designer";
import { useState } from "react";

/**
 * Preview data. `data.foo` drives the Float thread's conditional subject, so
 * flipping it between "bar" and anything else shows each branch.
 */
const VARIABLES = {
  data: {
    foo: "bar",
    name: "Ada",
    vip: true,
    body: "a fairly long body that will be truncated",
  },
  profile: {
    email: "ada@example.com",
  },
};

const VARIABLES_ELSE = {
  ...VARIABLES,
  data: { ...VARIABLES.data, foo: "qux", vip: false },
};

/**
 * Harness for C-20919: handlebars chips while editing, and branch rendering in
 * preview. The editor library has no engine/preview switcher of its own, so the
 * toggles live here.
 */
export function HandlebarsPage() {
  const [wysiwyg, setWysiwyg] = useState(false);
  const [branch, setBranch] = useState<"if" | "else">("if");

  return (
    <div>
      <div
        style={{
          backgroundColor: "#f5f3ff",
          border: "1px solid #ddd6fe",
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 16,
        }}
      >
        <strong>Handlebars (C-20919):</strong> block helpers, <code>{"{{else}}"}</code> and helper
        calls render as violet chips; plain variables keep the amber/blue chip. Switch to preview to
        render each branch against the data below.
        <div style={{ marginTop: 12, display: "flex", gap: 20, alignItems: "center" }}>
          <label>
            <input
              type="checkbox"
              checked={wysiwyg}
              onChange={(e) => setWysiwyg(e.target.checked)}
            />{" "}
            Preview (variableViewMode=wysiwyg)
          </label>
          <label>
            Branch:{" "}
            <select value={branch} onChange={(e) => setBranch(e.target.value as "if" | "else")}>
              <option value="if">data.foo = "bar" (if)</option>
              <option value="else">data.foo = "qux" (else)</option>
            </select>
          </label>
        </div>
      </div>

      <TemplateEditor
        variables={branch === "if" ? VARIABLES : VARIABLES_ELSE}
        variableViewMode={wysiwyg ? "wysiwyg" : "show-variables"}
        routing={{ method: "single", channels: ["email", "sms", "push", "inbox"] }}
      />
    </div>
  );
}
