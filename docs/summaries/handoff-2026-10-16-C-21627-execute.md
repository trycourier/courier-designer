# Session Handoff: C-21627 — shared opt-ins for fixed-layout channels and `meta.image`

**Date:** 2026-10-16, reworked the same day
**Branch:** `sam/c-21627-designer-shared-opt-ins-for-fixed-layout-channels-and`, on `main` (`675e8828`). PR #236.

Split out of the WhatsApp editor (C-21618) so the code every embedder runs is reviewed on its own. No WhatsApp code here; a channel that doesn't opt in behaves as before.

## Changes

- `components/extensions/DropRules` (internal, not a public export): a TipTap extension a channel configures on its editor — `fixedFirstBlock` (the first top-level block stays first and isn't dragged) and `sidebarTypes` (the sidebar blocks the editor takes; `null` takes all). Helpers: `getDropRules`, `acceptsSidebarBlock`, `allowedInsertPosition`, `isFixedFirstBlock`.
- `usePragmaticDnd`:
  - refuses a sidebar block the rules don't take, before any target branch (blocks, empty area, columns)
  - clamps a sidebar insert and a block move so nothing lands at position 0 above a fixed first block, whichever path computed the position
  - never moves a fixed first block
  - optional `toChannelElements(existing, editorElements)`: a drop saves what it returns, else the editor's elements as before
- `SortableItemWrapper`: reads the rules from its `editor` — a fixed first block keeps only its bottom edge and can't be dragged; `canDrop` refuses sidebar blocks the rules don't take.
- `IPhoneFrame`: optional `screenClassName` on the screen; status icons use `currentColor` (were fixed `#000000`), so they stay visible in dark mode — visible in SMS and Push too.
- Elemental: `image?: string` on `ElementalMetaNode` and its schema, as the API has it (backend C-21593); no channel reads it here.

## Decisions

- Rules live on the editor (an extension), not in DOM attributes, BECAUSE a typed option can't be set by a host page by accident and needs no ancestor lookups — STATUS: confirmed (Sam 2026-10-16)
- Rules are enforced where every drop ends (the insert and the move in `handleDrop`) and at the top of `onDrop`, not only on block edges, BECAUSE a drop on the editor's empty area takes a different path that could insert at position 0 — STATUS: confirmed
- `IPhoneFrame` stays one component BECAUSE a copy would drift; its status icons follow the text colour in every channel — STATUS: confirmed (Sam 2026-10-16)
- No guard for targets that apply their own drop BECAUSE `handleDrop` already inserts only for `"editor"` targets — STATUS: confirmed

## Verification

- `DropRules.test.ts` (6): no extension or no editor allows everything; defaults; sidebar types; the top-insert clamp; only the first block fixed.
- `SortableItemWrapper.drop-rules.test.tsx` (10): sidebar types, fixed first block edges and drag, and editors without rules unchanged.
- `usePragmaticDnd.test.tsx` (+7): `toChannelElements` used or not; a refused sidebar block; a top insert moved below a fixed first block, and at 0 without rules; a fixed first block not moved, and moved without rules. The three rule cases fail with the checks removed.
- `IPhoneFrame.test.tsx` (3): screen class added; icons in `currentColor`.

## Adversarial review (2026-10-16)

No regression found for editors without `DropRules`; every new check is skipped when the extension is absent:

- `onDrop` sidebar refusal, `handleDrop` insert clamp, move guard and clamp: accept or return the position unchanged without rules, and with a null `activeEditor`
- `triggerAutoSave`: unchanged without `toChannelElements`
- `SortableItemWrapper`: `canDrag` always true, edges and `canDrop` as before; reads the rules from the block's own `editor`
- Effect dependencies: `isFixedFirstElement` has the same inputs as `isLastElement`, so no extra re-registration
- A stale WhatsApp editor in the current-editor atom cannot make another channel refuse drops: switching channels sets the atom to `null` first (`useChannels.ts`), and Email passes its own editor
- Notes, not regressions: rules are found by extension name (`dropRules`); `validateElemental` now keeps `meta.image` instead of stripping it; one extension lookup per drag event
- Full `vitest` 4695 passed after the review

## Open

- C-21618 configures `DropRules` on the WhatsApp editor instead of DOM attributes.
- The move path's clamp (a later block moved to the top) has no test of its own; the insert path's does.
