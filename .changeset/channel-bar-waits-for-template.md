---
"@trycourier/react-designer": patch
---

Stop the channel bar showing every routed channel before the template loads.

`isTemplateLoadingAtom` has three states, and only two of them were being read:
`true` is a GET in flight, `false` is one that settled, and `null` is "no GET
has started yet". Everything guarding on it treated that `null` as "not
loading", so in the frame between mount and the fetch starting, `useChannels`
saw no content and no load in progress and concluded the template was new —
which means every routed channel is on offer. They then collapsed to the
channels the template actually has once the response landed.

Adds `isTemplatePendingAtom`, which is true from mount until a load that is
actually coming has settled, and false when no fetch is possible (a host
driving the editor through `value` alone) or when one already failed.
`TemplateProvider` now seeds the connection details into its store
synchronously rather than in an effect, so that answer is correct on the first
render. While pending, the channel bar shows a skeleton instead of a guess.
