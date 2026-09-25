import { TemplateEditor, useVariables } from "@trycourier/react-designer";
import { useState } from "react";
import { HARNESS_VARIABLES } from "./Layout";

/**
 * Preview data. `data.foo` drives the Float thread's conditional subject, so
 * flipping it between "bar" and anything else shows each branch.
 */
const VARIABLES = HARNESS_VARIABLES;

const VARIABLES_ELSE = {
  ...VARIABLES,
  data: { ...VARIABLES.data, foo: "qux", vip: false },
};


/**
 * Invalid cases, loaded as stored content rather than typed. Validation used to
 * run only on the input path, so a template reopened with a bad helper in it
 * came back looking clean — this is what makes that visible in the browser.
 */
const INVALID_CASES: [string, string][] = [
  ["invalid-unknown-helper", "{{frobnicate data.score}}"],
  ["invalid-unknown-block-helper", "{{#frobnicate data.score}}x{{/frobnicate}}"],
  ["invalid-unclosed-block", "{{#if data.user.isAdmin}}Admin"],
  ["invalid-mismatched-closer", "{{#if data.user.isAdmin}}Admin{{/unless}}"],
  ["invalid-stray-closer", "Admin{{/if}}"],
  ["invalid-condition-operator", '{{#if (condition data.score "=>" 80)}}x{{/if}}'],
  ["invalid-condition-single-eq", '{{#if (condition data.score "=" 87)}}x{{/if}}'],
  ["invalid-condition-missing-operand2", '{{#if (condition data.score ">=")}}x{{/if}}'],
  ["invalid-condition-one-operand", "{{#if (condition data.score)}}x{{/if}}"],
  ["invalid-unterminated-mustache", "Hello {{data.user.firstName"],
];

/** A block whose opener, body and closer are separate elements — how an author
 * writes a loop, and the shape that made every loop-local reference invalid. */
const MULTILINE_BLOCK = {
  version: "2022-01-01" as const,
  elements: [
    {
      type: "channel" as const,
      channel: "email" as const,
      elements: [
        { type: "text" as const, content: "{{#each data.items}}" },
        { type: "text" as const, content: "row: {{this.name}} {{@index}}" },
        { type: "text" as const, content: "parent: {{../data.user.firstName}}" },
        { type: "text" as const, content: "{{/each}}" },
      ],
    },
  ],
};

const INVALID_MATRIX = {
  version: "2022-01-01" as const,
  elements: [
    {
      type: "channel" as const,
      channel: "email" as const,
      elements: INVALID_CASES.map(([id, text]) => ({
        type: "text" as const,
        content: `${id}: ${text}`,
      })),
    },
  ],
};

/**
 * Harness for C-20919: handlebars chips while editing, and branch rendering in
 * preview. The editor library has no engine/preview switcher of its own, so the
 * toggles live here.
 */
/**
 * What Preview & Test would offer as manual inputs. A path used only inside a
 * helper has to appear here too, or the author cannot give it a value.
 */
function UsedVariables() {
  const { usedVariables } = useVariables("email");
  return (
    <div style={{ marginTop: 12, fontSize: 13 }}>
      <strong>Detected variables (email):</strong>{" "}
      {usedVariables.length ? (
        <code data-testid="used-variables">{usedVariables.join(", ")}</code>
      ) : (
        <em>none</em>
      )}
    </div>
  );
}

export function HandlebarsPage() {
  const [wysiwyg, setWysiwyg] = useState(false);
  const [branch, setBranch] = useState<"if" | "else">("if");
  const [loadInvalid, setLoadInvalid] = useState(false);
  const [loadBlock, setLoadBlock] = useState(false);

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
            <input
              type="checkbox"
              checked={loadInvalid}
              onChange={(e) => setLoadInvalid(e.target.checked)}
            />{" "}
            Load invalid-case matrix (stored content, not typed)
          </label>
          <label>
            <input
              type="checkbox"
              checked={loadBlock}
              onChange={(e) => setLoadBlock(e.target.checked)}
            />{" "}
            Load multi-line block (loop-locals across elements)
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
        {...(loadBlock
          ? { value: MULTILINE_BLOCK, autoSave: false as const }
          : loadInvalid
            ? { value: INVALID_MATRIX, autoSave: false as const }
            : {})}
        variables={branch === "if" ? VARIABLES : VARIABLES_ELSE}
        variableViewMode={wysiwyg ? "wysiwyg" : "show-variables"}
        routing={{ method: "single", channels: ["email", "sms", "push", "inbox"] }}
      />

      <UsedVariables />
    </div>
  );
}
