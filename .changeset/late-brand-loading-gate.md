---
"@trycourier/react-designer": minor
---

`EmailChannel`'s `isLoading` prop is now honoured, OR-ed with the editor's own template loading state. It was declared on `EmailProps` but never read — it reached `MainLayout` only by falling through the rest-spread, which meant it *replaced* the editor's loading state instead of adding to it, so `isLoading={false}` could clear a genuine template load.

This is a behaviour change on a published, typed prop: anyone relying on `isLoading={false}` to suppress the editor's own loading overlay loses that. The old semantics were accidental and undocumented, so this is a `minor` rather than a `major`, but it is not a no-op for existing callers.

The prop now lets a host hold the loading overlay up while it resolves data the canvas depends on. Studio uses it for the brand: the template read always finishes first, so the email preview briefly showed no background colour and no content background colour before the brand arrived.

The loading overlay now starts below the toolbar instead of covering it, so the channel tabs, Publish button and brand selector stay usable while it is up. That matters more now the gate is host-controlled and no longer bounded by the editor's own template read. When no `Header` is supplied the overlay still covers the full area.

`TemplateEditor` no longer forwards its own loading state into this prop. It fed `EmailLayout` the same `isTemplateLoadingAtom` value `Email` already reads, so the forwarding was redundant once the prop was OR-ed — and it left the host gate permanently occupied on that path.
