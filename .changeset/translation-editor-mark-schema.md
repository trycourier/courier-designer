---
"@trycourier/react-designer": patch
---

Stop the localization editor from blanking content that carries a mark its toolbar
hides. Headings (H1/H2/H3) hide the bold button, and SMS, push, inbox and the
raw/meta/action fields hide every formatting button — but those toolbar settings were
also removing the marks from the editor's schema. Existing content carrying a hidden
mark could then not be parsed at all, so the field rendered blank instead of showing
the text.

This was not only cosmetic: translating read back the blank editor and committed it
over the real source content, dropping the locale entry. Every mark now stays in the
schema and the toolbar settings only decide which buttons appear, so a bolded heading
or an inbox field with a link opens and translates with its content intact.
