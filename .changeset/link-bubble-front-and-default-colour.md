---
"@trycourier/react-designer": patch
---

Two link fixes in the email editor.

The link popover now sits above the text toolbar. Tippy puts its own `z-index: 9999` on the
bubble menu root, so the popover's `z-50` left it drawn behind the toolbar whenever the two
overlapped; it now renders at `z-[10000]`.

Creating a link inside a coloured run no longer inherits that colour. The link range is split
into its own `textStyle` run with the colour cleared, so the link renders in its default colour
and picks up the block-level colour rather than the surrounding override. Editing an existing
link — changing its URL or toggling link tracking — leaves the colour alone, so a colour picked
from the text toolbar after the link exists still wins.

Links also no longer render at their own font weight. Any global `a { font-weight: … }` a host
ships beats plain inheritance on every link, and studio's legacy `ThemeWrapper` ships one at
`500` — so a link inside an `h1` rendered lighter (500) than the heading around it (600). The
editor's `a.link` rule now states `font-weight: inherit`, alongside the `color` and
`text-decoration` it already pinned against that same global.
