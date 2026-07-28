---
"@trycourier/react-designer": minor
---

Expose the new legacy-Elemental email formatting properties as authoring controls: document-level body `padding`, base `font_size` and `line_height` on the email channel node; `font_size` / `line_height` on text, quote and list blocks; `font_size` on action buttons; and a per-run inline `font_size` via a new `fontSize` mark. The cascade matches the renderer — inline mark, then block, then document base, then the tier preset — with the document base skipping heading and subtext tiers.

The "Email styles" tab is reorganised into a Frame section (body padding, background colour, content body colour) and a Text section (base font size, line spacing), each with a "Reset to default" link. `EmailFramePaddingFields`, `EmailBaseTypographyFields` and `EmailBodyFrame` are exported so a host that supplies its own `render` prop gets the same controls.

Brings the canvas inset in line with the sent email, now that the author can set it. Three hardcoded insets that stood in for spacing nobody could configure are gone:

- **40px of horizontal padding on every block** (the row's `pl-10` and `.ProseMirror`'s `pr-10`). It reserved inline space for the drag handle and actions panel, which are absolutely positioned outside the content flow, and made the canvas overstate the email's content width by 40px per side.
- **The matching 40px offset on the drop indicator**, which otherwise sat 40px right of the blocks it belongs between.
- **The editor's own 40px of vertical padding**, which was *added* to the Frame value — so a 20px Frame previewed as 60px, and dialling it to 0 previewed more space than 20px did. `EmailBodyFrame` now owns the vertical inset outright, scoped so the other channels and the brand/translation editors keep their own padding.

Top-level list indent drops from 64px to the 40px a mail client gives a bare `<ul>`, which is all the renderer emits. The Frame padding is now the only inset.

Removing the horizontal padding moved the drag handle onto the block's content, which took two follow-on fixes. The handle stays **inside** the block's box (`left-0`): `draggable` and `dropTargetForElements` are registered on the same element and pragmatic-drag-and-drop resolves drop targets from whatever is under the pointer, so a handle out in the canvas gutter left the pointer over nothing for the whole drag — first no drop at all, then, once the gutter was made hit-testable, the indicator thrashing as the target was lost and re-acquired every frame. And the handle is now `z-30`: a selected block's `.node-element` is raised to `z-20`, which painted over a handle that now overlaps the content, making it unclickable as soon as the caret was in the block.

The trade-off is that the handle glyph overlaps the leading text while hovering a block, since there is no longer an empty strip inside the container for it to sit in.

Tooltips open after 100ms instead of 500ms, and the previously invisible font-size icon now renders.
