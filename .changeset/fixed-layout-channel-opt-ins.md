---
"@trycourier/react-designer": minor
---

Add opt-ins for channels with a fixed layout: a `DropRules` editor extension that keeps the first block first and limits which sidebar blocks an editor takes, enforced on every drop and move; a `toChannelElements` option on the drag hook so a drop saves the channel's whole element list; and a `screenClassName` on `IPhoneFrame`, whose status icons now follow the text colour so they stay visible in dark mode. The Elemental meta element also accepts an `image` link. Channels that don't opt in are unchanged.
