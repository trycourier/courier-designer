import { TemplateEditor } from "@trycourier/react-designer";

/**
 * Hostile host-app CSS injected as bare element selectors.
 * These simulate a real host application's global stylesheet
 * that would conflict with the embedded editor.
 */
const hostileStyles = `
  /* ===== HOSTILE HOST-APP STYLES ===== */
  /* These bare element selectors simulate a host application's global CSS. */
  /* They should NOT leak into the editor (inbound isolation). */
  /* The editor's Preflight should NOT override them outside (outbound isolation). */

  h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 2.5rem;
    font-weight: 800;
    color: #1a1a2e;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.05em;
    text-decoration: underline;
    text-decoration-color: #e94560;
    margin-bottom: 0.75rem;
  }

  h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #16213e;
    border-bottom: 2px solid #0f3460;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f3460;
    font-style: italic;
  }

  p {
    font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
    font-size: 1.1rem;
    line-height: 1.8;
    color: #333;
    text-indent: 1.5em;
    margin-bottom: 1em;
  }

  a {
    color: #e94560;
    font-weight: 600;
    text-decoration: underline wavy;
    text-underline-offset: 3px;
  }

  a:hover {
    color: #c81d4e;
    background-color: #fff0f3;
  }

  button {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background-color: #0f3460;
    color: white;
    border: 2px solid #0f3460;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 6px rgba(15, 52, 96, 0.3);
  }

  button:hover {
    background-color: #e94560;
    border-color: #e94560;
  }

  ul, ol {
    font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
    font-size: 1.1rem;
    color: #333;
    padding-left: 2em;
    margin-bottom: 1em;
  }

  li {
    margin-bottom: 0.5em;
    line-height: 1.6;
  }

  ul {
    list-style-type: square;
  }

  ol {
    list-style-type: upper-roman;
  }

  blockquote {
    font-family: Georgia, serif;
    font-style: italic;
    color: #555;
    border-left: 4px solid #e94560;
    padding: 1em 1.5em;
    margin: 1.5em 0;
    background: #faf0f3;
  }

  img {
    border: 3px solid #0f3460;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  hr {
    border: none;
    height: 3px;
    background: linear-gradient(to right, #e94560, #0f3460);
    margin: 2em 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    font-family: "Segoe UI", sans-serif;
  }

  th, td {
    border: 2px solid #0f3460;
    padding: 12px;
    text-align: left;
  }

  th {
    background-color: #0f3460;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  pre, code {
    font-family: "Fira Code", "Courier New", monospace;
    background-color: #1a1a2e;
    color: #e94560;
    border-radius: 6px;
  }

  pre {
    padding: 1.5em;
    overflow-x: auto;
  }

  code {
    padding: 0.2em 0.5em;
    font-size: 0.9em;
  }

  input, textarea, select {
    font-family: "Segoe UI", sans-serif;
    border: 2px solid #0f3460;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 1rem;
    color: #1a1a2e;
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.2);
  }
`;

const sectionStyle: React.CSSProperties = {
  padding: "2rem",
  border: "2px dashed",
  borderRadius: "12px",
  marginBottom: "1.5rem",
};

/**
 * CSS Scoping reproduction page.
 *
 * Injects hostile bare-element CSS (simulating a host app) and renders
 * both host-app content and the embedded editor so we can observe:
 *
 * - OUTBOUND leakage: Does the editor's Preflight reset the host-app
 *   elements shown below?
 * - INBOUND leakage: Do the hostile host-app selectors distort content
 *   inside the editor?
 */
export function CssScopingPage() {
  return (
    <>
      <style>{hostileStyles}</style>

      <div style={{ padding: "1.5rem 0" }}>
        {/* ── Explanation ── */}
        <div
          style={{
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            borderRadius: "8px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "#614700",
          }}
        >
          <strong>CSS Scoping Test Page</strong> — This page injects hostile
          bare-element CSS selectors (simulating a host application's global
          styles). The elements below in the{" "}
          <span style={{ color: "#0f3460", fontWeight: 600 }}>
            "Host App Content"
          </span>{" "}
          section should retain their styling (outbound isolation), while
          content inside the{" "}
          <span style={{ color: "#e94560", fontWeight: 600 }}>
            "Embedded Editor"
          </span>{" "}
          should NOT be affected by the host styles (inbound isolation).
        </div>

        {/* ── Section 1: Host App Content (tests OUTBOUND isolation) ── */}
        <div style={{ ...sectionStyle, borderColor: "#0f3460", background: "#f8f9ff" }}>
          <div
            style={{
              fontFamily: "system-ui",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#0f3460",
              marginBottom: "1rem",
            }}
          >
            ▼ Host App Content — These should keep their custom styles
          </div>

          <h1>Host App Heading 1</h1>
          <h2>Host App Heading 2</h2>
          <h3>Host App Heading 3</h3>

          <p>
            This is a paragraph in the host application. It should use Palatino
            serif font, have a text indent, and display in dark gray. If the
            editor's Preflight leaks out, this paragraph will lose its styling
            and revert to browser defaults.
          </p>

          <p>
            Here is a <a href="https://example.com">styled link</a> that should
            have a wavy red underline. And another paragraph with{" "}
            <code>inline code</code> that should have dark background and red
            text.
          </p>

          <div style={{ display: "flex", gap: "12px", marginBottom: "1em" }}>
            <button type="button">Primary Button</button>
            <button type="button" style={{ background: "#e94560", borderColor: "#e94560" }}>
              Danger Button
            </button>
          </div>

          <div style={{ display: "flex", gap: "2rem", marginBottom: "1em" }}>
            <div>
              <h3>Unordered List</h3>
              <ul>
                <li>Square bullet item one</li>
                <li>Square bullet item two</li>
                <li>Square bullet item three</li>
              </ul>
            </div>
            <div>
              <h3>Ordered List</h3>
              <ol>
                <li>Roman numeral item one</li>
                <li>Roman numeral item two</li>
                <li>Roman numeral item three</li>
              </ol>
            </div>
          </div>

          <blockquote>
            This is a blockquote in the host app. It should have a red left
            border, italic serif font, and a pink background.
          </blockquote>

          <hr />

          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Outbound isolation</td>
                <td>Testing</td>
                <td>Preflight should not reset host styles</td>
              </tr>
              <tr>
                <td>Inbound isolation</td>
                <td>Testing</td>
                <td>Host selectors should not distort editor</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Section 2: Embedded Editor (tests INBOUND isolation) ── */}
        <div style={{ ...sectionStyle, borderColor: "#e94560", background: "#fff8f9" }}>
          <div
            style={{
              fontFamily: "system-ui",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#e94560",
              marginBottom: "1rem",
            }}
          >
            ▼ Embedded Editor — Content here should NOT be affected by host
            styles
          </div>

          <TemplateEditor
            routing={{
              method: "single",
              channels: ["email"],
            }}
          />
        </div>
      </div>
    </>
  );
}
