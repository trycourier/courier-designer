---
"@trycourier/react-designer": patch
---

Fix inbox localization dropping the body, and stop inbox edits destroying translations.

`getOrCreateInboxElement` rebuilt the inbox body from a field whitelist, reading text off `.content` only — so a body whose text was in the rich `elements` form (what `applyLocaleToContent` produces for a locale override that supplies `elements`) rendered blank in the localized preview, and the node's `locales` were stripped on the way into the editor. `createTitleUpdate` then rebuilt the body without `locales` on the way out, so any save — including one triggered by a title-only edit — destroyed the body's translations. Both now carry the body's text and `locales` through, matching what the meta and action elements already did and what the push channel already does.

The same `.content` blind spot on the legacy leading-h2 title path is fixed, and a legacy title's `locales` are now recovered on save (those templates have no `meta` element, so they were previously written away). Locale maps are checked with `hasLocales` rather than bare truthiness, so an emptied map is dropped instead of persisted as `locales: {}`. When a template carries both a `meta` title and a leading h2, the h2's locales are no longer copied onto the body — they are the title's translations.

Behavior note: a body whose text was stored as rich `elements` is now flattened to a plain string, which re-enters markdown parsing on the way into the editor. Text containing `*`, `_`, `#` or `[` may therefore render with emphasis that was not typed. This is still strictly better than the previous behavior (blank), but it is not text-transparent.
