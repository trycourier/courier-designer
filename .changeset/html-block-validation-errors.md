---
"@trycourier/react-designer": patch
---

Tell the user why an HTML block edit wasn't saved. The HTML block's code editor
already refused to save code that failed validation, but it did so silently: the
editor kept showing the pasted code while the block kept its previous HTML, so
leaving the block (for example, to open the preview) and coming back looked like
the content had been wiped.

The sidebar now shows the reasons under the code editor. After an edit it says
the block keeps its last valid HTML; for a block whose stored HTML is already
invalid it says edits won't save until that's fixed. Outlook conditional comments
(`<!--[if mso]>` … `<![endif]-->`) are called out by name, since they aren't
supported. HTML and handlebars comments no longer count toward the bracket and tag
checks, so a `->` or a commented-out table inside a comment no longer blocks the
save. `MonacoCodeEditor` gains an optional `onValidationErrors(errors, { edited })`
callback that receives those reasons.
