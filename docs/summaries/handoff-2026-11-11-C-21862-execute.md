# Session Handoff: C-21862 — Keep WhatsApp header images that aren't JPEG or PNG out of review (designer)

**Date:** 2026-11-11
**Session Focus:** The WhatsApp header image picker takes only JPEG and PNG (Meta's image-header types) and says why it refuses anything else. Decision D-084 (Sam: restrictive, with a message). Publish-side check: services C-22609 (`imageLink`, released as `@trycourier/whatsapp-templates` 0.63.0); its dev check is in C-21454. Studio: the same branch name in `frontend` vendors this build.

**Branch:** `sam/c-21862-keep-whatsapp-header-images-that-arent-jpeg-or`, from `main` `d2b1124f`.

## What Was Accomplished

1. `extensions/ImageBlock/components/ImageBlockView.tsx` — `ImageBlockComponent` gains optional `allowedTypes` (drag highlight, drop filter, `accept`; defaults to PNG, JPEG, GIF, WebP) and `onFileRejected` (a drop held files but none of an allowed type). The email image block passes neither, so it is unchanged
2. `TemplateEditor/Channels/Whatsapp/WhatsappHeaderImage.tsx` — passes `["image/jpeg", "image/png"]`; refuses a chosen file of another type before uploading (the file dialog's "All files" bypasses `accept`); a refused drop or file sets `templateErrorAtom` to "WhatsApp header images must be JPEG or PNG."; read-only passes neither callback
3. Patch changeset `.changeset/whatsapp-header-image-types.md`

## Key Numbers

- `Channels/Whatsapp` + `extensions/ImageBlock`: 13 files / 160 tests (new `ImageBlockFileTypes.test.tsx`, 4; `WhatsappHeaderImage.test.tsx` +5)
- `pnpm --filter @trycourier/react-designer build` (lint:src, typecheck:src, build) green

## Verified (Sam, 2026-11-11)

- In Studio with this build vendored: a `.webp` can't be selected or dragged
- A WebP link set through the REST API (`meta.image`, draft) still shows in the editor: accepted, the picker can't see links set another way; publish refuses it once backend runs `@trycourier/whatsapp-templates` 0.63.0 (C-21454)

## Open Items

- Publish refusal of a non-JPEG/PNG header link: tested in C-21454's dev session after the backend bump

## Next Action

Review and merge; release; the frontend PR vendors this build.
