---
"@trycourier/react-designer": minor
---

Show the content of templates that were never wrapped in a channel block

A template whose elements sit at the top level rather than inside a
`{ type: "channel" }` block still sends. The renderer reads it that way too:
with no channel element present it shows every top-level element on every
channel, and only once a channel block appears does the top level have to hold
nothing else.

The editors did not read it that way. Each channel looked for its own block,
found none, and showed its defaults, so the author saw none of the content the
template was sending. Saving from there wrote a channel block beside the
elements the editor had never shown, and content that mixes channel blocks with
top-level elements does not render at all ("All top level elements must be
channels unless no channel element is present") — so opening one of these
templates was enough to break it.

Every channel now adopts those top-level elements as its content, and saving
writes them inside the channel block, which repairs the template on the way out.

Scoped to documents with no channel element at all. One that already mixes
channel blocks with top-level elements is separately broken and is left exactly
as it is — no adoption, no stripping — as is an attribute-only update, which
carries no elements to have adopted.
