---
"@trycourier/react-designer": patch
---

Brand editor: the "Manage Preferences" footer toggle now writes `{$.urls.preferences}` instead of `{{urls.preferences}}`, which brand footers never resolved and shipped as a dead link. The toggle also recognises existing preferences links in either brace form, and turning it on or off replaces a legacy `{{urls.preferences}}` link instead of leaving it behind. Footer variables and link hrefs are now saved in the single-brace `{path}` form brand footers render, and `{path}` loads back as a variable chip. [C-21458]
