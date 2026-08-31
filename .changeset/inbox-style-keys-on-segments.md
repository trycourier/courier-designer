---
"@trycourier/react-designer": patch
---

Name the Inbox button styles what Elemental calls them, and offer all four

The Inbox sidebar showed a two-way Filled/Outlined toggle over a private vocabulary that was
translated to Elemental on the way out. The segments are now `button`, `secondary`, `tertiary`
and `link` — the values `action.style` actually carries — so what an author picks is what the
Inbox and the email renderer act on. `tertiary` was already rendered by both and had no way to
be chosen here.

Buttons now carry their style as a node attribute rather than having it inferred from their
colours, which `secondary` and `tertiary` cannot be told apart by.

**`background_color` is the accent, not the fill.** It is also the only colour that survives the
send pipeline, since `action.color` is dropped before delivery. Both renderers read it as the
fill for `button`, the border and label for `secondary`, and the underline and label for
`tertiary`. Outlined used to save white there as a marker, which reaches a renderer as a white
border and a white label. It now saves the accent, and the canvas previews each style the way
the renderers draw it.

Templates saved under the old encoding — `link` plus a white background — still open as
outlined, and re-saving migrates both the style and the colour.
