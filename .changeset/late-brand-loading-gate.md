---
"@trycourier/react-designer": minor
---

`EmailChannel`'s `isLoading` prop is now honoured, OR-ed with the editor's own template loading state. It was declared on `EmailProps` but never read — it reached `MainLayout` only by falling through the rest-spread, which meant it *replaced* the editor's loading state instead of adding to it, so `isLoading={false}` could clear a genuine template load.

This is a behaviour change on a published, typed prop: anyone relying on `isLoading={false}` to suppress the editor's own loading overlay loses that. The old semantics were accidental and undocumented, so this is a `minor` rather than a `major`, but it is not a no-op for existing callers.

The prop now lets a host hold the loading overlay up while it resolves data the canvas depends on. Studio uses it for the brand: the template read always finishes first, so the email preview briefly showed no background colour and no content background colour before the brand arrived.

The Text section's base font size and line spacing inputs are seeded with the renderer's own base metrics (`14px` / `18px`, the elemental plain-text tier the document base applies to) when the properties are unset, instead of rendering empty — matching how the Frame inputs behave. The stored value is untouched: clearing a field still removes the property, and the section's "Reset to default" link remains the only signal distinguishing unset from explicitly set to the default.

The email Frame's default vertical inset is `20px`, not `0`. The renderer's `line` template — the default for every template authored here — emits a 20px top column and a 20px bottom spacer on the no-logo/no-footer path that a brandless template always takes, so a Frame showing `0` for unset `padding` understated the sent email by 20px per side.

`EmailBodyFrame` now zeroes `.ProseMirror`'s vertical padding with `!important`. Preview and read-only mode add `.courier-editor-main .ProseMirror { py-5 }`, which outweighed the wrapper's two-class override, so Preview & Test and the version-comparison panes silently gained 20px per side regardless of the authored value. Slack, MSTeams and the brand editor have no Frame, so that rule stays for them.

The loading overlay now starts below the toolbar instead of covering it, so the channel tabs, Publish button and brand selector stay usable while it is up. That matters more now the gate is host-controlled and no longer bounded by the editor's own template read. When no `Header` is supplied the overlay still covers the full area.

`TemplateEditor` no longer forwards its own loading state into this prop. It fed `EmailLayout` the same `isTemplateLoadingAtom` value `Email` already reads, so the forwarding was redundant once the prop was OR-ed — and it left the host gate permanently occupied on that path.
