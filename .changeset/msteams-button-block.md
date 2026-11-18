---
"@trycourier/react-designer": minor
---

Add the Button block to the MS Teams channel. It can be dragged in from the sidebar and pasted, and is sent as an Adaptive Card `Action.OpenUrl`, which the renderer already supported for API- and CMP-created templates.

Teams buttons use the same label + link form as Slack, since an Adaptive Card action has no colours or styles, and the editor draws them as neutral Teams action buttons. Teams sends every button in one row after the message, so the editor draws them there too: after all other blocks, side by side, whatever their order in the template. Bold and italic are hidden on the button label because an action title is plain text.

Dragging a button shows its drop indicator only where it will land: beside another button, or at the end of the button row. The indicator is sized like a Teams button. `DropRules` gains a `trailingTypes` option for this.

The MS Teams frame now looks like a current Teams channel post: app icon, name and time, a reply-in-thread footer drawn as a skeleton, and Fluent's light and dark neutrals. A message with buttons is drawn inside an Adaptive Card box, as it is delivered.

New export `useMSTeamsSidebarHasDetails(node)`: whether the Teams sidebar has a form for the selection, so a host can keep an empty sidebar closed (a paragraph has none). `MSTeamsRenderProps` gains an optional `setSelectedNode`, as Email's render props have, so a host can clear the selection on a click outside the canvas.
