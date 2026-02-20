---
"@trycourier/react-designer": patch
---

Fix email editor font styles to match backend MJML rendering

- Set email editor font-family to `Helvetica, Arial, sans-serif` (matching backend `<mj-all>`)
- Align font-size, color, and line-height for all text styles (text, h1, h2, subtext, quote) with backend values
- Fix heading 3 (subtext) round-trip: saving no longer silently converts h3 to h2, and loading correctly restores subtext as h3
