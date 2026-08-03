---
"@trycourier/react-designer": minor
---

`EmailChannel`'s `isLoading` prop is now honoured, OR-ed with the editor's own template loading state. It was declared on `EmailProps` but never read — it reached `MainLayout` only by falling through the rest-spread, which meant it *replaced* the editor's loading state instead of adding to it, so `isLoading={false}` could clear a genuine template load.

This is a behaviour change on a published, typed prop: anyone relying on `isLoading={false}` to suppress the editor's own loading overlay loses that. The old semantics were accidental and undocumented, so this is a `minor` rather than a `major`, but it is not a no-op for existing callers.

The prop now lets a host hold the loading overlay up while it resolves data the canvas depends on. Studio uses it for the brand: the template read always finishes first, so the email preview briefly showed no background colour and no content background colour before the brand arrived.

The Text section's base font size and line spacing inputs are seeded with the renderer's own base metrics (`14px` / `18px`, the elemental plain-text tier the document base applies to) when the properties are unset, instead of rendering empty — matching how the Frame inputs behave. The stored value is untouched: clearing a field still removes the property, and the section's "Reset to default" link remains the only signal distinguishing unset from explicitly set to the default.

The email Frame's default vertical inset is `20px`, not `0`. The renderer's `line` template — the default for every template authored here — emits a 20px top column and a 20px bottom spacer on the no-logo/no-footer path that a brandless template always takes, so a Frame showing `0` for unset `padding` understated the sent email by 20px per side.

The email canvas is exempt from preview/read-only mode's `.courier-editor-main .ProseMirror { py-5 }`, which used to add 20px per side in Preview & Test and the version-comparison panes regardless of the authored Frame value. Slack, MSTeams and the brand editor have no Frame of their own and keep that padding.

`MainLayout` gains `preserveHeaderWhileLoading` (default `false`), which starts the loading overlay below the toolbar instead of covering it. `Email` passes it only when the gate is the host's rather than its own template read: during the editor's own load the toolbar has nothing real to show — the title reads "Untitled", the brand and routing dropdowns are empty, every button is live — so covering it is the honest state. Once loaded, a host-held gate leaves the channel tabs, Publish button and brand selector usable, which matters because the overlay would otherwise take away the very control that triggered it.

`TemplateEditor` no longer forwards its own loading state into this prop. It fed `EmailLayout` the same `isTemplateLoadingAtom` value `Email` already reads, so the forwarding was redundant once the prop was OR-ed — and it left the host gate permanently occupied on that path.

`TemplateProvider` gains `emailFormattingEnabled`, which **defaults to `false`** — these controls are opt-in. Turn it on to offer every control that authors one of the new formatting properties — document body padding and base font size / line spacing, the per-block font size and line spacing fields, and the inline font-size button. They write Elemental the renderer has to understand, so a host on a backend without that support would otherwise offer controls whose values are silently dropped on send. That risk is why this defaults off, unlike the older `linkTrackingEnabled`, which merely toggles an affordance.
