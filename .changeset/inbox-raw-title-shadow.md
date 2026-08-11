---
"@trycourier/react-designer": patch
---

Stop the Inbox editor writing an un-interpolated `raw.title`, which made variables in an inbox message title render as literal `{{data.title}}`.

`createTitleUpdate` wrote the inbox title to **two** places: the `meta` node and the channel node's `raw.title`. Only the first is interpolated. The backend's `getTitle` checks a channel's `raw` block *before* recursing into its `elements`, and `raw` is never run through handlebars — `transformElementTree` does not descend into it. So the dead copy shadowed the working one and the raw braces reached the inbox. The message body, which goes through the normal element path, interpolated correctly the whole time — which is why this looked like a rendering bug rather than an authoring one.

The `raw.title` was deliberate, on the premise that the backend consumed it as a channel override via `slotRenderer("title")`. It does not: `slotRenderer` serves the legacy handlebars slot templates and never sees elemental `raw`. Inbox now writes `meta.title` only, matching what Push already did.

Templates saved by an affected build carry the stale `raw.title` in their stored content, so fixing the write path alone would not have healed them: `updateElemental` copies every existing channel attribute forward, and there was no way to express "remove this attribute" — the spread always resurrected it. A channel attribute passed as an explicit `undefined` now means *delete*, and the Inbox editor always passes `raw`, so an affected template sheds its `raw.title` on the next edit.
