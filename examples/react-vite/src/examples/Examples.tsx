import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * The catalog. Every example page is listed here with a sentence saying what it
 * demonstrates, so the list is browsable without opening each one — the same
 * shape courier-web's `Examples.tsx` uses.
 *
 * Adding an example means: a file in this directory, a route in `App.tsx`, and
 * a card here.
 */
export function Examples() {
  // Already inside the page column — Layout renders the Outlet in it, so
  // applying the column again here would double the gutters.
  return (
    <main style={{ paddingTop: 24, paddingBottom: 40 }}>
      <header style={{ marginBottom: 24, borderBottom: "1px solid #dddddd", paddingBottom: 12 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 22 }}>Courier Designer Examples</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#555555" }}>
          Pages built with <code>@trycourier/react-designer</code>, each isolating one behaviour.
          They share the tenant and template selected in the bar above.
        </p>
      </header>

      <ExampleSection title="Editing">
        <ExampleCard to="/examples/basic" title="Basic">
          The template editor with default settings — the page to reach for when checking a change
          by hand.
        </ExampleCard>
        <ExampleCard to="/examples/controlled-value" title="Controlled Value">
          The editor driven by a <code>value</code> prop, with the host owning the document and
          receiving every change.
        </ExampleCard>
        <ExampleCard to="/examples/custom-elements" title="Custom Elements">
          Overriding which blocks the sidebar offers and how they render.
        </ExampleCard>
        <ExampleCard to="/examples/custom-hooks" title="Custom Hooks">
          Driving the editor from outside with <code>useTemplateActions</code>, including the
          content transformer.
        </ExampleCard>
      </ExampleSection>

      <ExampleSection title="Variables">
        <ExampleCard to="/examples/variable-validation" title="Variable Validation">
          A custom validation config deciding which variables are allowed.
        </ExampleCard>
        <ExampleCard to="/examples/variable-autocomplete" title="Variable Autocomplete">
          Autocomplete suggestions sourced from the variables passed to the provider.
        </ExampleCard>
        <ExampleCard to="/examples/prefix-validation" title="Prefix Validation">
          Validation restricted to a required variable prefix.
        </ExampleCard>
      </ExampleSection>

      <ExampleSection title="Localization">
        <ExampleCard to="/examples/locales" title="Locales">
          Switching the preview locale and editing per-locale content.
        </ExampleCard>
        <ExampleCard to="/examples/translation-editor" title="Translation Editor">
          The standalone <code>TranslationEditor</code> against extracted text fields.
        </ExampleCard>
      </ExampleSection>

      <ExampleSection title="Embedding">
        <ExampleCard to="/examples/shadow-dom" title="Shadow DOM">
          The editor mounted inside a shadow root, which is how some hosts embed it.
        </ExampleCard>
      </ExampleSection>
    </main>
  );
}

function ExampleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, margin: "0 0 10px", color: "#111111" }}>{title}</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function ExampleCard({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: "14px 16px",
        border: "1px solid #e9ecef",
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
        background: "#ffffff",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#555555", lineHeight: 1.45 }}>{children}</div>
    </Link>
  );
}
