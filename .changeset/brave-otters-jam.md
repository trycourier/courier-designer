---
"@trycourier/react-designer": patch
---

Save the Inbox Outlined button as `style: "secondary"` instead of `link`

Elemental's `action.style` had no value meaning "outlined", so Outlined was encoded as `link`
carrying a sentinel colour pair. Downstream that reads as a link, and the live Inbox rendered an
underlined phrase where the author had configured a button.

Outlined now saves as `secondary`. Templates saved under the old encoding still open correctly —
`link` plus the outlined sentinel background is still read as Outlined — and re-saving migrates
them.
