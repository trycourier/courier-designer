---
"@trycourier/react-designer": patch
---

Draw the Inbox actions the way the kit draws them now

The canvas had `button` as the filled near-black button and `secondary` as an
outline with a shadow. The kit has since settled somewhere else: the plain button
stays exactly what every action in the wild already wears — the mode's own
surface, edged with the divider hairline and lifted by a shadow — and the
outlined look moved into a variant of its own, flat, with an edge you can
actually see.

The canvas is a preview of `CourierButton`, so it follows. `tertiary` and `link`
are unchanged.

`inboxActionLooks.test.ts` reads the stylesheet and pins all four against the
transcribed kit palette. The values have to be copied here — the kit ships to the
browser and this stylesheet is built here — and a transcription drifts quietly;
this is what makes the drift loud.
