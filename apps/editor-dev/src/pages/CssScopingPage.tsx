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

  /* ===== ADDITIONAL HOSTILE STYLES ===== */

  /* Universal selector — extremely aggressive */
  * {
    box-sizing: content-box;
  }

  /* Inline text elements — affect ProseMirror formatting */
  span {
    font-family: "Comic Sans MS", "Comic Sans", cursive;
    letter-spacing: 0.08em;
    color: #8b0000;
  }

  strong, b {
    font-weight: 900;
    color: #0f3460;
    text-shadow: 1px 1px 0 rgba(15, 52, 96, 0.2);
  }

  em, i {
    font-style: italic;
    color: #6a0572;
    font-family: Georgia, "Times New Roman", serif;
  }

  u {
    text-decoration: underline wavy #e94560;
    text-underline-offset: 4px;
  }

  s, del, strike {
    text-decoration: line-through double #e94560;
    color: #999;
  }

  mark {
    background-color: #ffe100;
    color: #1a1a2e;
    padding: 2px 6px;
    border-radius: 3px;
  }

  small {
    font-size: 0.7em;
    color: #888;
    font-style: italic;
  }

  sub, sup {
    font-size: 0.65em;
    color: #e94560;
  }

  /* Labels — affect sidebar form labels */
  label {
    font-family: Georgia, serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f3460;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: block;
    margin-bottom: 8px;
  }

  /* SVG icons — affect editor toolbar and UI icons */
  svg {
    fill: #e94560;
    stroke: #0f3460;
    stroke-width: 2;
    filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3));
  }

  svg path {
    fill: inherit;
    stroke: inherit;
  }

  /* Form element — affects sidebar forms */
  form {
    background-color: #f0e6ff;
    border: 2px solid #6a0572;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(106, 5, 114, 0.2);
  }

  /* Figure/figcaption — affects image blocks */
  figure {
    border: 3px dashed #e94560;
    padding: 1em;
    margin: 1.5em 0;
    background-color: #fff0f3;
    border-radius: 8px;
  }

  figcaption {
    font-family: Georgia, serif;
    font-style: italic;
    color: #e94560;
    text-align: center;
    margin-top: 0.5em;
    font-size: 0.9em;
  }

  /* Placeholder — affects editor and sidebar inputs */
  input::placeholder, textarea::placeholder {
    color: #e94560;
    font-style: italic;
    font-family: Georgia, serif;
    opacity: 1;
  }

  /* Text selection — affects editor content */
  ::selection {
    background-color: #e94560;
    color: white;
  }

  /* Contenteditable — directly targets ProseMirror */
  [contenteditable] {
    font-family: "Courier New", monospace;
    font-size: 18px;
    line-height: 2;
    color: #1a1a2e;
    background-color: #f5f0e1;
    border: 2px solid #c4a35a;
    padding: 20px;
    caret-color: #e94560;
  }

  [contenteditable]:focus {
    outline: 3px solid #e94560;
    box-shadow: 0 0 0 6px rgba(233, 69, 96, 0.15);
    background-color: #fdf8ef;
  }

  /* Extra button states */
  button:focus {
    outline: 3px dashed #e94560;
    outline-offset: 3px;
  }

  button:active {
    transform: scale(0.95);
    box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.3);
  }

  button:focus-visible {
    outline: 3px solid #0f3460;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(15, 52, 96, 0.3);
  }

  /* Specific input types */
  input[type="text"], input[type="url"], input[type="number"], input[type="email"] {
    background-color: #f0f7ff;
    border-left: 4px solid #0f3460;
  }

  input[type="range"] {
    accent-color: #e94560;
    height: 8px;
  }

  input[type="color"] {
    border: 3px solid #0f3460;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    padding: 4px;
  }

  /* ARIA role selectors — target editor toolbar/menus */
  [role="toolbar"] {
    background-color: #1a1a2e;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  [role="menu"], [role="listbox"] {
    background-color: #0f3460;
    color: white;
    border: 2px solid #e94560;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  [role="menuitem"], [role="option"] {
    padding: 12px 16px;
    font-family: "Segoe UI", sans-serif;
    color: white;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  [role="menuitem"]:hover, [role="option"]:hover {
    background-color: #e94560;
  }

  [role="dialog"] {
    background-color: #1a1a2e;
    color: white;
    border: 2px solid #e94560;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  [role="separator"] {
    height: 3px;
    background: linear-gradient(to right, #e94560, #0f3460);
    border: none;
  }

  [role="tooltip"] {
    background-color: #e94560;
    color: white;
    font-family: Georgia, serif;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  /* Pseudo-elements on all elements */
  p::first-line {
    font-variant: small-caps;
    font-weight: 700;
  }

  p::first-letter {
    font-size: 2em;
    font-weight: 900;
    color: #e94560;
    float: left;
    margin-right: 4px;
    line-height: 1;
  }

  /* Dialog/overlay elements */
  dialog {
    background-color: #1a1a2e;
    color: white;
    border: 3px solid #e94560;
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
    padding: 2rem;
  }

  dialog::backdrop {
    background: rgba(26, 26, 46, 0.8);
    backdrop-filter: blur(4px);
  }

  /* Details/summary */
  details {
    border: 2px solid #0f3460;
    border-radius: 8px;
    padding: 0.5em 1em;
    margin-bottom: 1em;
    background-color: #f0f7ff;
  }

  summary {
    font-weight: 700;
    color: #0f3460;
    cursor: pointer;
    padding: 0.5em 0;
    font-family: "Segoe UI", sans-serif;
  }

  summary:hover {
    color: #e94560;
  }

  /* Section/article/nav — semantic elements */
  section, article {
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1.5em;
    margin-bottom: 1.5em;
    background-color: #fafbfc;
  }

  header {
    background-color: #0f3460;
    color: white;
    padding: 1em 1.5em;
    border-radius: 8px 8px 0 0;
  }

  footer {
    background-color: #f0f0f0;
    color: #666;
    padding: 1em 1.5em;
    border-top: 2px solid #dee2e6;
    font-size: 0.9em;
    text-align: center;
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
          <strong>CSS Scoping Test Page</strong> — This page injects hostile bare-element CSS
          selectors (simulating a host application's global styles). The elements below in the{" "}
          <span style={{ color: "#0f3460", fontWeight: 600 }}>"Host App Content"</span> section
          should retain their styling (outbound isolation), while content inside the{" "}
          <span style={{ color: "#e94560", fontWeight: 600 }}>"Embedded Editor"</span> should NOT be
          affected by the host styles (inbound isolation).
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
            This is a paragraph in the host application. It should use Palatino serif font, have a
            text indent, and display in dark gray. If the editor's Preflight leaks out, this
            paragraph will lose its styling and revert to browser defaults.
          </p>

          <p>
            Here is a <a href="https://example.com">styled link</a> that should have a wavy red
            underline. And another paragraph with <code>inline code</code> that should have dark
            background and red text.
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
            This is a blockquote in the host app. It should have a red left border, italic serif
            font, and a pink background.
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

          <h3>Inline Formatting Elements</h3>
          <p>
            This text contains <strong>bold text</strong>, <em>italic text</em>,{" "}
            <u>underlined text</u>, <s>strikethrough text</s>, <mark>highlighted text</mark>,{" "}
            <small>small text</small>, H<sub>2</sub>O and x<sup>2</sup>. These should all retain
            their host-app styling with custom colors and decorations.
          </p>

          <p>
            Here is a <span>styled span element</span> that should appear in Comic Sans with red
            color per the host styles.
          </p>

          <h3>Form Elements</h3>
          <form onSubmit={(e) => e.preventDefault()} style={{ marginBottom: "1em" }}>
            <label htmlFor="host-input">Host App Label</label>
            <input
              id="host-input"
              type="text"
              placeholder="Host placeholder text..."
              style={{ marginBottom: "8px", width: "100%" }}
            />
            <label htmlFor="host-textarea">Text Area</label>
            <textarea
              id="host-textarea"
              placeholder="Type here..."
              rows={2}
              style={{ width: "100%", marginBottom: "8px" }}
            />
            <button type="submit">Submit Form</button>
          </form>

          <h3>Figure &amp; Image</h3>
          <figure>
            <img
              src="https://placehold.co/300x100/0f3460/white?text=Host+Image"
              alt="Host app sample"
              style={{ width: "100%", maxWidth: "300px" }}
            />
            <figcaption>Host app figure caption in Georgia italic</figcaption>
          </figure>

          <h3>SVG Icon</h3>
          <svg width="48" height="48" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>

          <h3>Details / Summary</h3>
          <details>
            <summary>Click to expand host-app details</summary>
            <p>
              This content is inside a details element. It should retain the host-app border,
              background, and summary styling.
            </p>
          </details>

          <h3>Selection Test</h3>
          <p>
            Try selecting this text — it should appear with a red background and white text per the
            hostile ::selection styles.
          </p>
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
            ▼ Embedded Editor — Content here should NOT be affected by host styles
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
