---
"@trycourier/react-designer": minor
---

Expose the new legacy-Elemental email formatting properties as authoring controls: document-level body `padding`, base `font_size` and `line_height` on the email channel node; `font_size` / `line_height` on text, quote and list blocks; `font_size` on action buttons; and a per-run inline `font_size` via a new `fontSize` mark. The cascade matches the renderer — inline mark, then block, then document base, then the tier preset — with the document base skipping heading and subtext tiers.

The "Email styles" tab is reorganised into a Frame section (body padding, background colour, content body colour) and a Text section (base font size, line spacing), each with a "Reset to default" link. `EmailFramePaddingFields`, `EmailBaseTypographyFields` and `EmailBodyFrame` are exported so a host that supplies its own `render` prop gets the same controls.

Also removes 40px of dead horizontal padding that every block carried — it reserved inline space for the drag handle and actions panel, which are both absolutely positioned outside the content flow, and made the canvas misreport the email's real content width. The visible inset now comes solely from the document Frame padding. Tooltips open after 100ms instead of 500ms, and the previously invisible font-size icon now renders.
