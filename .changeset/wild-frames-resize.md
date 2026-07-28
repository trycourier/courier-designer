---
"@trycourier/react-designer": minor
---

Expose the new legacy-Elemental email formatting properties as authoring controls: document-level body `padding`, base `font_size` and `line_height` on the email channel node; `font_size` / `line_height` on text, quote and list blocks; `font_size` on action buttons; and a per-run inline `font_size` via a new `fontSize` mark. The cascade matches the renderer — inline mark, then block, then document base, then the tier preset — with the document base skipping heading and subtext tiers.

The "Email styles" tab is reorganised into a Frame section (body padding, background colour, content body colour) and a Text section (base font size, line spacing), each with a "Reset to default" link. `EmailFramePaddingFields`, `EmailBaseTypographyFields` and `EmailBodyFrame` are exported so a host that supplies its own `render` prop gets the same controls.

Brings the canvas's *vertical* inset in line with the sent email, now that the author can set it. The editor's own 40px of vertical padding used to be **added** to the Frame value, so a 20px Frame previewed as 60px and dialling it down to 0 previewed more space than 20px did; `EmailBodyFrame` now owns that inset outright, scoped so the other channels and the brand/translation editors keep their own padding. Top-level list indent drops from 64px to the 40px a mail client gives a bare `<ul>`, which is all the renderer emits.

The 40px of horizontal chrome padding on each block is deliberately kept. It looks like dead space, but it is the only non-editable strip a pointer can grab: blocks are dragged via the native HTML5 drag that pragmatic-drag-and-drop uses, and a mousedown over a block's own text starts a text selection instead, so removing it made blocks undraggable by their leading edge. The horizontal canvas width therefore still overstates the email's by 40px per side.

Tooltips open after 100ms instead of 500ms, and the previously invisible font-size icon now renders.
