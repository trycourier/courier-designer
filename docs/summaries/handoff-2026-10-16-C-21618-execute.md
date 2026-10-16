# Session Handoff: C-21618 — WhatsApp channel editor

**Date:** 2026-10-16
**Branch:** `sam/c-21618-designer-work`, on `sam/c-21627-designer-shared-opt-ins-for-fixed-layout-channels-and` (`9ee3f18e`, PR #236). Retarget to `main` once #236 merges.

## What Was Accomplished

1. `Channels/Whatsapp/`:
   - `Whatsapp.tsx`, `WhatsappLayout.tsx`: the channel; its update handler ignores updates while the template loads or switches (the C-21461 guard SMS and Push got)
   - `WhatsappEditor.tsx`: the bubble in `IPhoneFrame` (`screenClassName`); image header above the text, header line hidden for it
   - The editor configures `DropRules` (C-21627): `fixedFirstBlock: true` (the header line stays first and can't be dragged, on every drop path) and `sidebarTypes: ["text", "list"]`; `WhatsappHeaderFirst` is the backstop for other edits (paste, deletion)
   - `WhatsappSideBar.tsx`: header Text | Image switch; button form (label, link); Slack's details for a selected list
   - `WhatsappButtonRows.tsx`: buttons under the bubble, at most 2; select, duplicate, delete; a Button dropped from the sidebar lands in the slot (a non-`"editor"` drop target, so the drag hook leaves it alone)
   - `WhatsappHeaderImage.tsx`: upload through `useImageUpload`, saved as `meta.image`; a failed upload sets a generic template error
   - `whatsappContent.ts`: Elemental ↔ editor. The header is the block's `meta`: Image while `image` is set and `title` is not, Text otherwise; Text → Image removes `title`, Image → Text blanks `image`; blank values written as they are. A save drops a block-level `header` written before the backend moved to `meta`
   - `whatsappExtensions.ts`: header line kept first; Tab does not nest a list
2. Registration: `whatsapp` in `ChannelType` and `CHANNELS`, `useChannels` default content, `TemplateEditor` layout, `WhatsappChannel` / `WhatsappEditor` / `WhatsappSideBar` exports (public-exports snapshot), `WhatsappIcon`, WhatsApp-scoped styles, test helpers, architecture-consistency test
4. Not in the sandbox page's channel list; a `minor` changeset

## Decisions Made This Session

- Gated by host opt-in only, no gating code BECAUSE default routing is Email only, the tabs are limited to the host's channels, and an embedder's tenant templates have no WhatsApp publish — STATUS: confirmed (Sam 2026-10-16)
- The sandbox page doesn't list `whatsapp` BECAUSE a developer who clones the repo shouldn't be offered it — STATUS: confirmed (Sam 2026-10-16)
- Blank header values are written as they are, as email does; the backend reads them as no header — STATUS: confirmed (Sam 2026-10-16)
- The header line stays hidden, not cleared, while Image is picked; Image → Text restores it as `meta.title` — STATUS: confirmed (Sam 2026-10-16)

## Verification

- New: `whatsappContent` (29), `whatsappExtensions` (4), `Whatsapp.content-stability` (10, incl. the loading guard, which failed before the fix), `WhatsappSideBar` (11), `WhatsappButtonRows` (6), `WhatsappEditor` (5), `WhatsappHeaderImage` (4). The Tab-nesting case fails without its extension.
- `Whatsapp.content-stability` also checks the editor's `DropRules` options.
- Full `vitest` 4779 passed; build passed (lint:src, typecheck:src).
- Browser, Studio on dev after the split (Sam, 2026-10-16): a Button dragged from the sidebar snaps into the slot under the bubble; lists stay one level.
- Earlier on dev through Studio (vendored build): text header, blank image, uploaded image and back to text published as Meta templates with the expected headers.

## Open Items

- Studio (C-21617) vendors this after it merges
- Lists nest one level only (WhatsApp renders deeper items as literal dashes)

## Next Action

Review #236, then this PR; retarget this one to `main` when #236 merges.
