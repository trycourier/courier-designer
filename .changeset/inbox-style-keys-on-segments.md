---
"@trycourier/react-designer": patch
---

Name the Inbox button styles what Elemental calls them, and save nothing but the style

The Inbox sidebar showed a two-way Filled/Outlined toggle over a private vocabulary that was
translated to Elemental on the way out — a look-shaped name over a value the renderers never
knew by that name. It now offers all four styles Elemental carries, named Primary, Secondary,
Tertiary and Link under a "Style" label, the same names the studio's own action toolbar uses.
`tertiary` was already rendered everywhere and had no way to be chosen here.

**An Inbox action now saves its style and nothing else.** No fill, no label colour, no radius, no
border, no padding. There is no UI to set any of them, so every one of those values was a default
the node happened to hold — the email button's `#0085FF` fill, its 8px/16px padding — written into
the template as though an author had chosen it. Worse, a value in the template outranks the theme
an integrator sets, so those accidental defaults beat the theme they had configured. Enabling the
second button was the clearest symptom: the row's schema defaulted both buttons to `#000000` on
`#000000`, and the pair went out black-on-black.

With the colours gone, the Inbox renders its own — per style and per light/dark mode — and an
integrator's theme is what decides how these look.

**The canvas previews exactly that.** The four looks are `CourierButtonVariants` transcribed, so
what the designer draws is what `@trycourier/courier-ui-inbox` draws: `#171717` ink on `#FFFFFF`,
4px radius, 14px/500, 6px 10px padding, an 8px row gap, and a link that rests at the link colour
rather than at body ink. A lone action and a pair are now spaced and sized identically, so
toggling the second button no longer moves the first.

**Inbox only.** Inbox actions are their own node rather than a borrowed email button, which is
what let the email button's defaults reach them in the first place. Email, SMS and Push are
untouched and still save the colours, padding and radius their authors give them.

Templates saved under the old encoding — `link` plus a white background — still open as
outlined, and re-saving migrates them.
