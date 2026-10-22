---
"@trycourier/react-designer": minor
---

Templates created in the editor are now saved with `scope: "strict"`, so `{{data.x}}` and `{{tenant.x}}` render on send the way the editor previews them instead of coming out blank. [C-21456]

**Behaviour change for new templates.** A bare `{{x}}` (which the editor already flags with "use `data.x`") now renders blank in a newly created template, and a payload that wraps variables twice (`data: { data: { … } }`) no longer fills `{{data.x}}`. Templates that already have content keep the scope they were saved with; opening or editing them does not change it.

If one send path serves both old and new templates, send `data: { ...vars, data: vars }`, which renders the same in both. Hosts that need new templates to keep the legacy behaviour can pass `defaultScope="default"` to `TemplateEditor`.
