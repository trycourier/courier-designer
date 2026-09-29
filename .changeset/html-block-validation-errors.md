---
"@trycourier/react-designer": patch
---

Tell the user why an HTML block edit wasn't saved. The HTML block's code editor
already refused to save code that failed validation, but it did so silently: the
editor kept showing the pasted code while the block kept its previous HTML, so
leaving the block (for example, to open the preview) and coming back looked like
the content had been wiped.

The sidebar now shows the reasons under the code editor and says the block keeps
its last valid HTML. Outlook conditional comments (`<!--[if mso]>` … `<![endif]-->`)
are called out by name, since they aren't supported and otherwise surface as
confusing bracket and tag-count errors. `MonacoCodeEditor` gains an optional
`onValidationErrors` callback that receives those reasons.
