---
"@trycourier/react-designer": minor
---

Add a Jsonnet block to the Slack channel, matching the v1 designer.

The block holds raw Jsonnet that the backend compiles into Slack Block Kit, so it covers the payloads the WYSIWYG blocks cannot express. It is edited in the sidebar with a Monaco editor — Monaco ships no Jsonnet grammar, so one is registered, ported from the v1 designer's CodeMirror mode — alongside the same five starter templates v1 offered and the shared conditions section. The canvas shows a summary card rather than the code, since Jsonnet compiles against send data the editor does not have; preview modes say as much instead of pretending to render it.

Hosts opt in through `TemplateProvider`'s new `slackJsonnetEnabled` prop, which gates the sidebar block only. The Elemental converters always read and write `jsonnet` elements, so a host with the flag off round-trips a block created by a host with it on instead of dropping it.

The card sits 6px inside the selection outline on all four sides while its content stays on the text column of the surrounding blocks, and `node-jsonnet` joins the three `styles.css` allow-lists that govern drag-handle visibility — without them the handle showed in preview mode and never hid while editing.
