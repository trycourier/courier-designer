---
"@trycourier/react-designer": patch
---

A `var`/`inline-var` path with an array index, such as `{{var "tokens.expo[0].status"}}`, is now listed as a template variable and resolves in preview; it used to be treated as malformed although the send prints it.
