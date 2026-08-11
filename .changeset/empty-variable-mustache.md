---
"@trycourier/react-designer": patch
---

Fix empty/unbound variables serializing to `{{}}` (or `{{undefined}}`), which crashed inbox
sends. An empty mustache is a Handlebars syntax error — the backend render throws and drops
the whole message (`UNDELIVERABLE`). Every variable-serialization boundary now drops an
empty-id variable instead of emitting braces: `convertTiptapToElemental`,
`convertTiptapToMarkdown`, and both variable node schemas (`renderHTML`/`renderText`).
Existing templates carrying `{{}}` heal on their next save. The editor's "don't flag an
empty variable while it's being edited" behavior is unchanged.
