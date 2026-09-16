---
"@trycourier/react-designer": minor
---

Rebuild how the editor owns the document, so it behaves the way a person watching the screen would predict (C-20386).

There was one atom for the document, and it was at once the source the editors rendered from, the sink they wrote to, and the payload autosave read. A write carried no indication of which of those it was, so every consumer guessed — and the guesses were focus checks, a module-global form counter, transition flags and timers. This replaces the guessing with a store that tags each write with its role: `commit` for the author's own edit, `seed` for a document the host hands over, `amend` for the editor's own canonicalisation, `replace` for a deliberate swap such as a version restore, `reset` for a different template.

What changes for an author:

- A late API response can no longer overwrite what they just typed. The author owns the document from their first edit; a response that was in flight before it is simply stale.
- Email keeps the last keystrokes across a channel switch. It was the only channel that buffered edits for 200ms, and a switch unmounted it well inside that window.
- Undo survives a channel switch and a trip through preview. History is one stack over the document rather than one per editor instance, which the editor threw away on every remount.
- A selection is re-resolved against the document when it is replaced, instead of being left pointing at a node that is no longer there.
- A template the editor cannot render says so and turns editing off, rather than opening as a blank canvas the author types over and saves.
- Autosave saves what is on screen without a flush registry to ask every editor for its pending state first.

The six per-channel restoration effects are now one shared hook, and `templateEditorContentAtom` keeps its shape for hosts: reading is unchanged, and writing still means "here is the document from the server".
