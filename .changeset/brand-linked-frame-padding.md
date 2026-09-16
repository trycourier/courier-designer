---
"@trycourier/react-designer": minor
---

Let a template's email Frame follow the brand's padding.

`padding` on the email channel node can now carry `{brand.email.padding.vertical}` / `{brand.email.padding.horizontal}` refs, which the renderer resolves from the brand's `settings.email.padding` (20px per axis when the brand sets none). The Frame inputs show what those refs resolve to and track a brand change live, and a new email channel is seeded with the linked value when the brand has a padding of its own — existing templates keep whatever they already have.

Editing either Frame input writes literals for both axes, so a linked Frame unlinks as a whole rather than leaving one axis tracking the brand.
