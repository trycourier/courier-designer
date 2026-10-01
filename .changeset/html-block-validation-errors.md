---
"@trycourier/react-designer": patch
---

Tell the user why an HTML block edit wasn't saved. The HTML block's code editor
already refused to save code that failed validation, but it did so silently: the
editor kept showing the pasted code while the block kept its previous HTML, so
leaving the block (for example, to open the preview) and coming back looked like
the content had been wiped.

The sidebar now shows the reasons under the code editor, as the `code` field's form error (the same `FormMessage` every other sidebar field uses). After an edit it says
the block keeps its last valid HTML; for a block whose stored HTML is already
invalid it says edits won't save until that's fixed. Outlook conditional comments
(`<!--[if mso]>` … `<![endif]-->`) save as written, including the
`<!--[if !mso]><!-->` form that used to be dropped silently. Because the send currently
strips HTML comments, an HTML block that uses them gets a warning (never an error) in the
sidebar, in the canvas gutter and in `collectTemplateIssues`, as
`outlook-conditional-stripped`: the email still delivers, but Outlook gets the same markup
as other clients. HTML and handlebars comments no longer count toward the bracket and tag
checks, so a `->` or a commented-out table inside a comment no longer blocks the
save. `MonacoCodeEditor` gains an optional `onValidationErrors(errors, { edited })`
callback that receives those reasons.
