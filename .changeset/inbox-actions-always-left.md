---
"@trycourier/react-designer": patch
---

Always left align an Inbox action, and paint the preview's overflow menu the right color

An Inbox action turned the `align` it carried into auto-margins, so an action saved with
`align: "center"` — or one built by a path that defaulted to it — drew centered on the canvas.
The Inbox lays its actions out in a left-aligned flex row and offers no way to move them, so
that was a position the Inbox could never reproduce. The action is now always left aligned and
ignores `align` entirely, in preview mode too, where the link wrapper carried it as well.

The preview header's overflow menu was also still painting `--ring` — `#0085FF` in dark — rather
than the Inbox's own icon color. `MoreMenuIcon` handed its color to `Path` as a raw `fill` prop,
and `Path` only skips its `courier-fill-ring` class when it is given a `color`; the class then
outranked the `fill` attribute. It now passes `color`, so the icon rests at `black[500]` in light
and `white[500]` in dark, as the Inbox draws it.
