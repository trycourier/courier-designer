---
"@trycourier/react-designer": patch
---

Resolve variables written inside HTML blocks. `{{data.x}}` in an HTML block now
appears in the template's used-variable list (so it can be filled in Preview &
Test) and renders as a variable chip, or as its value in WYSIWYG mode, instead
of staying literal. Handlebars helpers, loop-scoped refs (`{{this.x}}`, `{{$.x}}`)
and triple-brace escapes are left untouched, since only the backend evaluates them.
