---
"@trycourier/react-designer": minor
---

Open templates whose content was never wrapped in a channel block

Content written before the channel block exists still sends — with no channel
element present the renderer shows every top-level element on every channel —
but the editor returned an empty document for it. The author saw a blank page,
wrote something new, and the save appended a channel block beside the elements
it could not see. Mixed top-level content does not render at all ("All top level
elements must be channels unless no channel element is present"), so opening one
of these templates was enough to break it.

`convertElementalToTiptap` now adopts those elements into the channel it is
opening, and saving writes them inside the channel block, which repairs the
template on the way out.

This is a behaviour change to a public export, for one input: content with no
channel element and at least one top-level element, which previously converted
to an empty document. A document that already mixes channel blocks with
top-level elements is separately broken and is deliberately left untouched —
no adoption, no stripping.
