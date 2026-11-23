---
"@trycourier/react-designer": minor
---

Add a message format to the MS Teams channel, and the Button block for its Adaptive card format.

The Teams channel node gains `message_format: "text" | "adaptive_card"`. A template without it is "text", which is how Teams messages are delivered today: markdown, with any action as a link. "adaptive_card" sends one Adaptive Card with the text and a row of buttons. Hosts switch it with `useMSTeamsFormat`, which also reports why a switch is blocked. A format the template's blocks can't show is disabled with the reason: buttons block Text, and dividers, quotes and headings block Adaptive card.

Each format greys out the sidebar blocks it can't show, with a tooltip on how to enable them: Button in Text, Divider in Adaptive card. In Adaptive card the quote and heading options are disabled in the text menu, pasted dividers are dropped, and buttons stay in one row after every other block — the document keeps them last, so a drop lands where its indicator shows. In Text, a button already in the template is drawn as the link it is delivered as, and pasted buttons are dropped. Teams buttons use the label + link form, with bold/italic hidden on the label.

Teams buttons are dragged by the whole button rather than a grip, selected with a ring that hugs the button, with their duplicate/delete toolbar beside it; their label is edited in the sidebar. Dragging a button along the row moves it into the hovered button's place, whichever half of it the pointer is on, and the row previews the new order while dragging (the dragged button leaves its slot and a ghost with its label takes the new one). `DropRules` gains `wholeDragTypes` for this, and `trailingTypes` (block types kept in a trailing row; a preset such as `button:primary` counts as its block type) and `setTrailingTypes`. The MS Teams frame now looks like a current Teams channel post, with a skeleton reply-in-thread footer. New exports: `useMSTeamsFormat`, `getMSTeamsFormat`, `useMSTeamsSidebarHasDetails`; `MSTeamsRenderProps` gains an optional `setSelectedNode`.
