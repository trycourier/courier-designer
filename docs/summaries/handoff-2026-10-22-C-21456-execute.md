# Session Handoff: C-21456 — new templates start `scope: "strict"`

**Date:** 2026-10-22
**Branch:** `repro-c-21456-strict-vars-4d46c6b3`, on `main` (`0add2d2f`). PR: pending (this commit). CI pending after this push.

The designer saved content as `{ version, elements }`. Without `scope: "strict"` the backend renders against `{ profile, ...data }` (`send/worker/provider-render/elemental/evaluation/apply-transformations.ts:42-43`), so the `{{data.x}}` / `{{tenant.x}}` paths the picker, lint and preview all assume sent blank. Reproduced with a real `/send` on dev: an unscoped template rendered `Hi ,` and an empty tenant; the same content with `scope: "strict"` rendered `Hi Jordan` and `Acme Freight`.

## Changes

- `ElementalContent.scope?: "strict"` (`types/elemental.types.ts`).
- `newContentScopeAtom` (`TemplateEditor/store.ts`): when set, `templateEditorContentAtom`'s write adds that scope to content that has none.
- `TemplateEditor`: new prop `defaultScope?: "strict" | "default"` (default `"strict"`). The load effect sets the atom to `"strict"` only when the template loaded with no content and no `value`; it is cleared on template switch and when a `value` prop arrives.
- README: `defaultScope` row and a "Variable scope" section under Sending. Changeset `minor`.

## Decisions

- Scope is decided once at load and applied in the content atom's write, not at each of the ~9 places that create content, BECAUSE `updateElemental` is reached with null content from ~14 callers and threading the prop through them is wide; external content enters only at the `value` sync and the load sync, both of which clear the atom — STATUS: confirmed
- No backend default in the GraphQL create path BECAUSE `save` replaces `data` wholesale, so the designer's next autosave would drop a server-added scope — STATUS: confirmed
- Existing templates are never switched BECAUSE customers' send payloads may depend on the legacy root — STATUS: confirmed (Geraldo 2026-10-22)
- Strict is the default with an opt-out prop and a `minor` bump BECAUSE new templates authored as the editor instructs are otherwise broken, and the opt-out covers hosts with a mixed fleet — STATUS: confirmed (Geraldo 2026-10-22)

## Verification

- `store.test.ts` (+2): scope added while the atom is set; untouched when null. Full vitest green, `lint:src` and `typecheck:src` clean, `build-code` OK.
- Live on dev, editor-dev (throwaway harness, removed) against `api.courierdev.com`, tenant `zz-c21456`. Each case read the saved draft back via GraphQL and, where it renders, published and sent with `/send`:
  1. New template, prop omitted → draft `scope: "strict"`; send "Hi Jordan at Acme Freight".
  2. New template, `defaultScope="default"` → no scope; `{{recipientName}}` sends "Hi Jordan".
  3. Existing unscoped `zz-ui-legacy`: open (autosaves) and edit → no scope; send identical to the pre-edit baseline plus the edit (`root=[Jordan] data=[] tenant=[]`).
  4. Existing strict `zz-ui-strict` opened with `defaultScope="default"` → keeps strict; send matches baseline.
  5. SMS channel added to the unscoped template → still no scope.
  6. New template open, then switch to unscoped `zz-ui-legacy2` and edit → no scope.
  7. Unscoped open, then switch to new `zz-ui-new-switch-2` and type → strict; send "Hi Jordan".
  8. Controlled `value` (unscoped), autosave off → `onChange` has no scope; nothing saved server-side.
  - Both-modes payload `{ recipientName, data: { recipientName } }` renders on both the legacy and new strict templates.

## Open

- Dev fixtures left on tenant `zz-c21456` (`zz-c21456-*`, `zz-ui-*`).
- Not done (ticket's other items): preview reading `content.scope`, a banner for unscoped templates using `data.`/`tenant.`, missing-variable warnings, the shared render context, the PUT warning.
