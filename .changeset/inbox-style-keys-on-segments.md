---
"@trycourier/react-designer": patch
---

Name the Inbox button styles what Elemental calls them, and draw them the way the Inbox does

The Inbox sidebar showed a two-way Filled/Outlined toggle over a private vocabulary that was
translated to Elemental on the way out — a look-shaped name over a value the renderers never
knew by that name. It now offers all four styles Elemental carries, named Primary, Secondary,
Tertiary and Link, the same names the studio's own action toolbar uses. `tertiary` was already
rendered everywhere and had no way to be chosen here.

Buttons carry their style as a node attribute rather than having it inferred from their colours,
which `secondary` and `tertiary` cannot be told apart by.

**`background_color` is the accent, not the fill.** It is also the only colour that survives the
send pipeline, since `action.color` is dropped before delivery. Both renderers read it as the
fill for `button`, and the border and label for `secondary` and `tertiary`. Outlined used to
save white there as a marker, which reaches a renderer as a white border and a white label.

**The canvas now previews what `@trycourier/courier-ui-inbox` renders.** Colours, border, radius,
weight and padding come from the kit's own values — near-black ink `#171717` on a `#FFFFFF`
surface, 4px radius, 14px/500, 6px 10px padding — instead of the pure black and ad-hoc sizing the
designer used to invent. The four styles are a ladder: filled, outlined, borderless, and a link,
which is the only one that stops being a button.

Requires `@trycourier/courier-ui-core` with the borderless `tertiary` look; before that release
`tertiary` renders as outlined in the Inbox.

Templates saved under the old encoding — `link` plus a white background — still open as
outlined, and re-saving migrates them.
