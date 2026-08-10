---
"@trycourier/react-designer": patch
---

Default link blue moves to `#007AFF` — the `a.link` fallback a host gets when it doesn't set `--brand-link-color`.

Block-level and selected-text typography no longer render blank when unset. The font-size and line-spacing fields on text, quote and list blocks, the button's label size, and the bubble menu's text size now show the value the block or run **already renders at** — the document base, then the tier preset — and keep tracking the document base as it moves. Nothing is written to the block until the author types a *different* number, so an untouched block still carries no `font_size` / `line_height` of its own.

The inherited value is resolved by a new `resolveInheritedTypography()`, which mirrors `getEmailEditorDocumentStyleVars` so a field cannot claim a size the canvas doesn't apply: the base font size reaches the body tiers only, the base line height reaches every tier, and a base font size with no base line height auto-scales the way the renderer does. For a text run the closest ancestor block that sets a size wins, matching the CSS-variable cascade the node views build.

Two consequences worth knowing: typing the number a field was already showing is treated as "inherit" rather than pinning the block to it, and the bubble menu's size button now always shows a number instead of showing nothing when the run inherits.

Authored text metrics are also capped — 128px font size, 160px line spacing — in every commit path (document, block and per-run), not just as the inputs' `max`, which a typed or pasted value bypasses. Over-limit values are capped rather than dropped.
