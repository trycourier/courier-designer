---
"@trycourier/react-designer": patch
---

A variable chip inside a button label now looks like every other chip.

The button chip carried its own amber/blue palette on the element itself, so its
square box painted over the rounded pill the chip draws with `::before`, and a
separate rule blacked out the label. It read as a different control with square
corners. The palette is gone from both the stylesheet and `ButtonRowComponent`,
which hand-rolled the same pill a second time; both now take the standard
`.courier-variable-chip` look, warning and invalid states included. The pill's
background is opaque, so it stays legible on any button colour.
