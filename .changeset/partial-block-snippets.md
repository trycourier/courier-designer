---
"@trycourier/react-designer": patch
---

Accept handlebars partial blocks (`{{#> name}}…{{/name}}`), which brand snippets use. They were read as a block helper named `>`, flagged as an unknown helper and a mismatched close, and blocked Publish and Send on templates that render. Partial names are not checked — they resolve at send time.
