---
"@trycourier/react-designer": patch
---

Fix the inbox localization preview rendering a blank body.

`getOrCreateInboxElement` rebuilt the inbox body from a field whitelist, reading text off `.content` only — so a body whose text was in the rich `elements` form rendered blank. `applyLocaleToContent` produces exactly that form when a locale override supplies `elements`, which is why the blank body showed up under a preview locale and nowhere else. Text is now read through `extractPlainTextFromNode`, which handles both storage forms and was already used by inbox's own save path. The same blind spot on the legacy leading-h2 title path is fixed too.

This also closes a data-loss path: because the localized body arrived blank, the next save wrote it back as an empty paragraph.

Behavior note: a body whose text was stored as rich `elements` is now flattened to a plain string. That string re-enters markdown parsing on the way into the editor and the next save persists the parsed result, so `Use *stars* here` is stored as `Use stars here` — permanently, not merely rendered that way. Flattening also drops anything a rich child carried beyond its text: a `link` child keeps its label and loses its `href`, and an `img` child disappears. Inbox action buttons are stored as separate `action` elements and are unaffected. This is pre-existing behavior for bodies already stored as plain `content`; what is new is that rich-`elements` bodies now take the same path. They previously rendered blank and were saved as an empty paragraph, so this remains a clear improvement — but it is lossy, not text-transparent.

Not addressed here, tracked as follow-ups: inbox saves still drop the body's `locales`, so a title-only edit destroys the body's translations; a template holding both a `meta` title and a leading h2 still mis-slots the heading into the body; and with `locale` set while the editor is editable, the first edit persists the translation as the source body.
