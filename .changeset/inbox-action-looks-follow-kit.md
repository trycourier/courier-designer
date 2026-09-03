---
"@trycourier/react-designer": patch
---

Draw the Inbox actions the way the kit draws them now

`button` stays the filled one it has always been, the kit's `primary`. What moved
is `secondary`: it used to carry the same shadow as a filled button, and now it
is flat, which is what tells the outline apart from the button it sits beside.
Its edge is a gray you can actually see rather than the divider hairline, pitched
per mode because one value cannot read the same on both faces.

The canvas is a preview of `CourierButton`, so it follows. `tertiary` and `link`
are unchanged.

`inboxActionLooks.test.ts` reads the stylesheet and pins all four against the
transcribed kit palette. The values have to be copied here — the kit ships to the
browser and this stylesheet is built here — and a transcription drifts quietly;
this is what makes the drift loud.
