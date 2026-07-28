---
"@trycourier/react-designer": minor
---

Expose the new legacy-Elemental email formatting properties as authoring controls: document-level body `padding`, base `font_size` and `line_height` on the email channel node; `font_size` / `line_height` on text, quote and list blocks; `font_size` on action buttons; and a per-run inline `font_size` via a new `fontSize` mark. The cascade matches the renderer — inline mark, then block, then document base, then the tier preset — with the document base skipping heading and subtext tiers.

The "Email styles" tab is reorganised into a Frame section (body padding, background colour, content body colour) and a Text section (base font size, line spacing), each with a "Reset to default" link. `EmailFramePaddingFields`, `EmailBaseTypographyFields` and `EmailBodyFrame` are exported so a host that supplies its own `render` prop gets the same controls.

Makes the canvas inset match the sent email, now that the author can set it. Three hardcoded insets that stood in for spacing nobody could configure are gone: 40px of horizontal padding on every block (it reserved inline space for the drag handle and actions panel, both absolutely positioned outside the content flow), the matching 40px offset on the drop indicator, and the editor's own 40px vertical padding, which used to be *added* to the Frame value — so a 20px Frame previewed as 60px and dialling it to 0 previewed more space than 20px did. The Frame padding is now the only inset. Top-level list indent drops from 64px to the 40px a mail client gives a bare `<ul>`, which is all the renderer emits.

Tooltips open after 100ms instead of 500ms, and the previously invisible font-size icon now renders.
