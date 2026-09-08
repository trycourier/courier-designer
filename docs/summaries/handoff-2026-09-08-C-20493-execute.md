# Session Handoff: Brand-linked Frame padding (horizontal)

**Date:** 2026-09-08
**Session Duration:** one session — implement in `courier-designer`, vendor into `frontend`
**Session Focus:** C-20493. The email Frame's horizontal inset can now follow the brand's `settings.email.padding` instead of carrying its own literal.
**Context Usage at Handoff:** high

## What Was Accomplished

1. **Per-token brand refs on the Frame's `padding`** → `packages/react-designer/src/lib/utils/cssValues.ts`. New `BRAND_PADDING_VERTICAL_REF` / `BRAND_PADDING_HORIZONTAL_REF`, `formatPaddingWithBrandHorizontal(verticalPx)` (writes `<v>px {brand.email.padding.horizontal}`), `isBrandLinkedPadding` (true when the *horizontal* token is the ref), `resolvePaddingVH(value, brand)` (resolves each token independently; `undefined` when any token is neither a length nor a known ref, matching the renderer dropping an unresolvable padding), and `resolveBrandPaddingVH(raw)` (the brand's own inset, 20px per axis when unset, plus `isSet`).

2. **Only the horizontal axis links.** The brand padding exists to align the body gutter with the header/footer chrome, so the vertical inset stays the template's own spacing and is always editable. Editing the vertical keeps a linked horizontal ref in place; the horizontal input is inert while linked.

3. **`useEmailDocumentStyles`** → resolves the Frame against the attached brand (read off `templateDataAtom`, where the brand-linked colours read theirs), and exposes `isPaddingLinkedToBrand`, `canLinkPaddingToBrand`, `linkPaddingToBrand()`, `unlinkPaddingFromBrand()`, `brandPadding`. `resolveEmailDocumentStyles(channel, brandPadding?)` takes the brand pair so read-only surfaces resolve the same way.

4. **Frame UI matches the brand-linked colour fields** → `EmailDocumentStyleFields.tsx`. Two full-width stacked rows (the badge would cover the value at half width). The horizontal row shows the brand's value, is non-interactive while linked, and carries a `brand` badge with the same chain glyphs and styling as `BrandLinkedInputColor` in studio; clicking it toggles "Unlink from brand" / "Link to brand". Unlinking freezes the brand's current horizontal as the template's own literal. No brand attached → no badge. "Reset to default" only shows when unlinked.

5. **A brand-new email channel is seeded linked** → `EmailEditor.tsx`, both creation seams (fresh template, and adding email to a template that had no email channel). Existing templates are never touched.

6. **`GetTenant` now selects `settings.email.padding`** → `Providers/api/common.ts`. Without it a linked Frame silently read as the 20px fallback on any host that relies on the designer's own query.

7. Tests: `hooks/brandLinkedPadding.test.tsx` (20 cases — token helpers, per-token resolution, unresolvable refs, brand gate, link/unlink, vertical-edit-keeps-link, brand-change tracking). `publicExports` snapshot updated for the four new exports. Whole suite: 132 files / 3104 tests.

8. `minor` changeset → `.changeset/brand-linked-frame-padding.md`

## Contract (settled with the backend session, PR trycourier/backend#10176)

- Stored form: `<vertical>px {brand.email.padding.horizontal}`. The renderer resolves per token; the horizontal ref resolves to 20px when the brand sets no padding, so a seeded new template renders byte-identically to the `20px 20px` literal it replaced.
- An earlier backend note said to write *both* refs and never a mixed literal/ref pair. That is superseded — it assumed the vertical was not user-editable. The backend resolver handles the mixed form, and the backend session has recorded the settled contract on its side.
- An unresolvable ref makes the renderer drop the whole padding and fall back to its own default; `resolvePaddingVH` returns `undefined` for that case so the editor shows the same thing.

## Verified

Live against dev through studio on localhost, with the vendored `dist`:

- Linked Frame shows the brand's horizontal and its own vertical; `20px {brand.email.padding.horizontal}` stored.
- Badge → unlink → `20px 48px` stored, input editable, "Reset to default" appears; badge → link → back to the ref.
- Editing the vertical while linked → `32px {brand.email.padding.horizontal}`, link intact.
- Four sends read back from `/messages/{id}/output`: linked + brand `20px 12px` → body `padding:0px 12px`; linked + unpadded brand → `0px 20px`; literal `20px 20px` + padded brand → `0px 20px` (template wins); `32px {ref}` → body `0px 12px` with a 32px spacer. No `{brand.` in any rendered output.

## Follow-ups

- `email-version.tsx` in studio (version-comparison panes) calls `resolveEmailDocumentStyles(channel)` without a brand, so a linked Frame previews there at the renderer default rather than the brand's value. Legacy surface, left alone.
