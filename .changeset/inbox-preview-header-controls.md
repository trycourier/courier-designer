---
"@trycourier/react-designer": patch
---

Show only the overflow menu in the Inbox preview header, in the Inbox's own color

The preview header carried a filter and an expand control alongside the overflow menu. Neither
does anything here — there is nothing to filter and nowhere to expand to — and a control that
cannot be operated reads as broken rather than as a preview. Only the overflow menu remains.

It also now rests at the color the Inbox draws its own overflow icon in: `black[500]` in light
and `white[500]` in dark, from `inbox.header.actions.button.icon.color`. It had been a fixed
`#737373` in both, which meant the preview's header disagreed with the header it previews in one
mode or the other.
