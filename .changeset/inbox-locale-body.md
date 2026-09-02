---
"@trycourier/react-designer": patch
---

Fix inbox localization dropping the body, and stop inbox edits destroying translations.

`getOrCreateInboxElement` rebuilt the inbox body from a field whitelist, reading text off `.content` only — so a body whose text was in the rich `elements` form (what `applyLocaleToContent` produces for a locale override that supplies `elements`) rendered blank in the localized preview. Text is now read through `extractPlainTextFromNode`, which handles both storage forms and was already used by inbox's own save path. The same blind spot on the legacy leading-h2 title path is fixed too.

`createTitleUpdate` rebuilt the body without `locales`, so any save — including one triggered by a title-only edit — destroyed the body's translations. It now recovers them from the **stored** content rather than from the editor's output: a round trip through tiptap runs locales through `convertLocaleMarkdownToElements`, which rewrites `{content}` into `{elements}`, re-introducing the very shape the studio-side writer fix and the backend's `interpolate-locales` workaround exist to remove. Locales are therefore no longer carried into the editor at all.

Legacy templates whose title is the leading h2 have no `meta` element, so their title translations were previously written away on save. They are now recovered — and re-keyed from the text-node shape (`{content}`/`{elements}`) into the meta shape (`{title}`), since every consumer of a meta locale reads `.title`.

Which node supplies the title and which supplies the body is now resolved once, by a shared `resolveInboxParts`, so the loader and the save path cannot disagree. They previously did: with an empty-title `meta` plus a leading h2, the editor showed the h2 as the title and the save dropped it.

Locale maps are checked with `hasLocales` rather than bare truthiness, so an emptied map is dropped instead of persisted as `locales: {}`.

Carrying the body's translations forward is now conditional on what the body still holds. An emptied body keeps none: a blanket carry-forward outlived the body itself, leaving a node with no source text but a live translation, so a localized send still rendered the old string. An edited body keeps its translations, but any that lack a `_sourceHash` are stamped with the hash of the source they were actually written against — `computeStaleLocales` reads a missing hash as "unknown", i.e. not stale, so a legacy translation carried onto rewritten text would otherwise claim to match text it was never translated from.

`resolveInboxParts` also skips a stray leading h2 when picking the body, not just when the h2 became the title. A template carrying both a `meta` title and a leading h2 (a shape older designer builds wrote) slotted the heading into the body: the editor showed it as the body, and the next save wrote it back as the body, destroying the real body node and its translations on the first keystroke. A lone h2 is still used as the body, since it is the only body text there is.

The editor-restoration effect re-derives through the same locale lens as the initial content memo. It read the raw content, so with a preview locale selected any later `templateEditorContent` update — saving a translation in another pane, for one — looked like a change against the editor's localized document and snapped the preview back to source-language text, undoing the localized render this change ships.

Behavior note: a body whose text was stored as rich `elements` is now flattened to a plain string. That string re-enters markdown parsing on the way into the editor, and the next save persists the parsed result — so `Use *stars* here` is stored as `Use stars here`, permanently, not merely rendered that way. This is pre-existing behavior for bodies already stored as plain `content`; what is new is that rich-`elements` bodies now take the same path. They previously rendered blank and were saved as an empty paragraph, so this is still a clear improvement — but it is lossy, not text-transparent. Flattening also discards anything a rich child carried beyond its text: a `link` child keeps its label and loses its `href`, and an `img` child contributes nothing and disappears. Inbox action buttons, which are stored as separate `action` elements, are unaffected. Locale entries are also unaffected: they no longer pass through the editor.
