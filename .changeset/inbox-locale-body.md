---
"@trycourier/react-designer": patch
---

Fix inbox localization dropping the body, and stop inbox edits destroying translations.

`getOrCreateInboxElement` rebuilt the inbox body from a field whitelist, reading text off `.content` only — so a body whose text was in the rich `elements` form (what `applyLocaleToContent` produces for a locale override that supplies `elements`) rendered blank in the localized preview. Text is now read through `extractPlainTextFromNode`, which handles both storage forms and was already used by inbox's own save path. The same blind spot on the legacy leading-h2 title path is fixed too.

`createTitleUpdate` rebuilt the body without `locales`, so any save — including one triggered by a title-only edit — destroyed the body's translations. It now recovers them from the **stored** content rather than from the editor's output: a round trip through tiptap runs locales through `convertLocaleMarkdownToElements`, which rewrites `{content}` into `{elements}`, re-introducing the very shape the studio-side writer fix and the backend's `interpolate-locales` workaround exist to remove. Locales are therefore no longer carried into the editor at all.

Legacy templates whose title is the leading h2 have no `meta` element, so their title translations were previously written away on save. They are now recovered — and re-keyed from the text-node shape (`{content}`/`{elements}`) into the meta shape (`{title}`), since every consumer of a meta locale reads `.title`.

Which node supplies the title and which supplies the body is now resolved once, by a shared `resolveInboxParts`, so the loader and the save path cannot disagree. They previously did: with an empty-title `meta` plus a leading h2, the editor showed the h2 as the title and the save dropped it.

Locale maps are checked with `hasLocales` rather than bare truthiness, so an emptied map is dropped instead of persisted as `locales: {}`.

Behavior note: a body whose text was stored as rich `elements` is now flattened to a plain string, which re-enters markdown parsing on the way into the editor. Text containing `*`, `_`, `#` or `[` may therefore render with emphasis that was not typed. This applies to the base text only — locale entries no longer pass through the editor, so translations are not re-parsed. Still strictly better than the previous behavior (blank), but not text-transparent.
