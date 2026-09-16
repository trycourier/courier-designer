import { TemplateProvider } from "@trycourier/react-designer";
import { useState, type CSSProperties, type FormEvent } from "react";
import { Outlet } from "react-router-dom";

/**
 * Deliberately not seeded from the environment. A stale id in a `.env` is worse
 * than an empty field: the editor opens, fails against a template nobody meant
 * to load, and the errors look like the designer's rather than the config's.
 * Paste the ids you want and press Load.
 */

/** Ids are free text: a dropdown can only offer what someone hardcoded. */
const idInputStyle: CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: 12,
  padding: "4px 8px",
  border: "1px solid #dee2e6",
  borderRadius: 4,
  background: "#ffffff",
  color: "#212529",
  minWidth: 220,
};

/**
 * The one column everything sits on — the pinned bar, the examples, the
 * catalog. The gutters live here rather than on each consumer so the left and
 * right keylines are the same line the whole way down the page.
 */
export const contentColumn: CSSProperties = {
  minWidth: 800,
  width: "70%",
  margin: "0 auto",
  paddingLeft: 20,
  paddingRight: 20,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "#6c757d",
};

interface Target {
  tenantId: string;
  templateId: string;
}

const buttonStyle: CSSProperties = {
  fontSize: 12,
  padding: "5px 12px",
  border: "1px solid #0069d9",
  borderRadius: 4,
  background: "#0069d9",
  color: "#ffffff",
  cursor: "pointer",
};

/**
 * Both are required. A template is only readable through its tenant — the
 * client schema's single route to one is `tenant(tenantId!) { notification }` —
 * so without a tenant the designer does not fetch at all and you get an empty
 * editor that looks like a new template rather than a failure.
 */
const isComplete = (t: Target) => Boolean(t.tenantId.trim() && t.templateId.trim());

export function Layout() {
  // What is typed, and what is loaded. Keeping them apart is the point: the ids
  // used to be bound straight to the provider, so every keystroke re-pointed it
  // at a half-typed id and fired a doomed fetch.
  const [draft, setDraft] = useState<Target>({ tenantId: "", templateId: "" });
  const [target, setTarget] = useState<Target | null>(null);

  const handleTemplateCreated = (_newTemplateId: string) => {};

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isComplete(draft)) {
      setTarget({ tenantId: draft.tenantId.trim(), templateId: draft.templateId.trim() });
    }
  };

  const dirty =
    target === null || draft.tenantId !== target.tenantId || draft.templateId !== target.templateId;

  return (
    <>
      {/*
        Pinned and full-bleed: the bar spans the viewport so it reads as chrome,
        but its contents stay on the same centred column as the page below, and
        it sits above the editor rather than being scrolled under by it.
      */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          background: "#f8f9fa",
          borderBottom: "1px solid #e9ecef",
        }}
      >
        <form
          onSubmit={submit}
          style={{
            ...contentColumn,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          <label style={labelStyle}>
            Tenant
            <input
              style={idInputStyle}
              value={draft.tenantId}
              onChange={(e) => setDraft((d) => ({ ...d, tenantId: e.target.value }))}
              placeholder="tenant id"
              spellCheck={false}
              autoComplete="off"
              autoFocus
            />
          </label>
          <label style={labelStyle}>
            Template
            <input
              style={idInputStyle}
              value={draft.templateId}
              onChange={(e) => setDraft((d) => ({ ...d, templateId: e.target.value }))}
              placeholder="template id"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <button type="submit" style={buttonStyle} disabled={!isComplete(draft)}>
            {target ? "Reload" : "Load"}
          </button>
          {target && dirty && (
            <span style={{ fontSize: 12, color: "#b8860b" }}>not loaded yet — press Reload</span>
          )}
        </form>
      </div>

      <div style={{ ...contentColumn, height: "90%" }}>
        {target ? (
          // Keyed on the target so switching template remounts cleanly rather
          // than re-pointing a live provider at a different record.
          <TemplateProvider
            key={`${target.tenantId}/${target.templateId}`}
            templateId={target.templateId}
            tenantId={target.tenantId}
            token={import.meta.env.VITE_JWT_TOKEN || ""}
            apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
            variables={{}}
          >
            <Outlet
              context={{
                templateId: target.templateId,
                tenantId: target.tenantId,
                handleTemplateCreated,
              }}
            />
          </TemplateProvider>
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );
}

/** Shown until a tenant and template have been submitted. */
function EmptyState() {
  return (
    <div
      style={{
        marginTop: 48,
        padding: "32px 24px",
        border: "1px dashed #dee2e6",
        borderRadius: 8,
        textAlign: "center",
        color: "#6c757d",
      }}
    >
      <div style={{ fontSize: 15, color: "#212529", marginBottom: 6 }}>No template loaded</div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        Paste a tenant id and a template id into the bar above, then press Load.
        <br />
        The designer is not mounted until then, so a wrong id shows up here rather than as a wall of
        fetch errors.
      </p>
    </div>
  );
}

// Hook to access layout context
export interface LayoutContext {
  templateId: string;
  tenantId: string;
  handleTemplateCreated: (templateId: string) => void;
}
