import { TemplateEditor } from "@trycourier/react-designer";
import type { VariableValidationConfig } from "@trycourier/react-designer";
import { useState } from "react";

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


/**
 * References resolved by the enclosing block, loaded as stored content.
 *
 * This page is the only harness carrying a host validator, and a host rule that
 * demands a `data.`/`profile.` prefix rejects every one of these — so they are
 * only judged correctly if block scope suppresses the host check. Under `#each`
 * that is `this.*`/`@index`; under `#with` it is a bare `id`, which no
 * shape-based rule could recognise.
 */
const BLOCK_SCOPE_CASES: [string, string][] = [
  ["each-array-objects", "{{#each data.items}}{{this.name}} x{{this.qty}}; {{/each}}"],
  ["each-bare-this", "{{#each data.tags}}[{{this}}]{{/each}}"],
  ["each-index-first-last", "{{#each data.items}}{{@index}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}"],
  ["if-inside-each", '{{#each data.items}}{{#if (condition this.qty ">" 1)}}{{this.name}}{{/if}}{{/each}}'],
  ["inc-with-index", "{{#each data.items}}{{inc @index}}. {{this.name}}{{/each}}"],
  ["with-block", "{{#with data.order}}Order {{id}} is {{status}}{{/with}}"],
  ["with-nested", "{{#with data.billing}}{{#with plan}}{{name}} {{seats}}{{/with}}{{/with}}"],
];

const BLOCK_SCOPE_MATRIX = {
  version: "2022-01-01" as const,
  elements: [
    {
      type: "channel" as const,
      channel: "email" as const,
      elements: BLOCK_SCOPE_CASES.map(([id, text]) => ({
        type: "text" as const,
        content: `${id}: ${text}`,
      })),
    },
  ],
};

export function PrefixValidationPage() {
  const [loadBlockScope, setLoadBlockScope] = useState(false);
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
        <div style={{ marginTop: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={loadBlockScope}
              onChange={(e) => setLoadBlockScope(e.target.checked)}
            />{" "}
            Load block-scope matrix (stored content, not typed) — every chip should stay violet
          </label>
        </div>
      </div>

      <TemplateEditor
        {...(loadBlockScope ? { value: BLOCK_SCOPE_MATRIX, autoSave: false as const } : {})}
        variables={VARIABLES}
        disableVariablesAutocomplete
        variableValidation={variableValidation}
        routing={{ method: "single", channels: ["email"] }}
      />
    </div>
  );
}
