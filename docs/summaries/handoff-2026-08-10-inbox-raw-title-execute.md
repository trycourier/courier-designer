# Session Handoff: Inbox `raw.title` shadowing — stop writing an un-interpolated title

**Date:** 2026-08-10
**Session Focus:** Root-cause a report that "variables are not rendering properly in courier web", trace it to this repo, fix it, and vendor the fix into studio.
**Branch:** `mike/c-inbox-raw-title` (off `main` @ `807b4775`)
**PR:** https://github.com/trycourier/courier-designer/pull/196

## What Was Accomplished

1. Reproduced the report: an inbox message title containing a variable renders as the literal `{{data.title}}`; the body of the same message interpolates correctly.
2. Root-caused it to `createTitleUpdate` in this repo writing the inbox title to **two** places — the `meta` element (interpolated) and the channel node's `raw` block (not interpolated).
3. Fixed both halves (write path + heal path), added regression tests, opened PR #196.
4. Vendored the built dist into studio — `trycourier/frontend#5365`.
5. Added an end-to-end regression test in the SDK — `trycourier/courier-web#238`.

## The Defect, Precisely

`createTitleUpdate`'s inbox branch returned:

```js
return {
  elements: [{ type: "meta", title }, body, ...actions],
  ...(title && { raw: { title } }),   // ← unconditional, ignored storageFormat
};
```

The backend's `getTitle` (`send/worker/provider-render/elemental/utils.ts:111-130`) checks a channel's `raw` block **before** recursing into its `elements`, and `raw` is never handlebars-evaluated — `getChannelOverrides` copies `element.raw` verbatim and evaluates only `raw.html`. So the dead copy shadowed the working one.

The inbox branch also `return`ed **before** the `storageFormat === "raw"` check, so unlike every other channel it ignored the detected format and always wrote `raw`.

## Decisions Made This Session

- **Removed `raw.title` rather than making the backend prefer `meta`.** Mike's call: the backend should not compensate for a designer defect. `getTitle`'s raw-precedence dates to `bfabe9f8f` (2024-09-05) and is unchanged.
- **Added delete-on-`undefined` semantics to `updateElemental`.** Without it, already-saved templates could never shed `raw.title`: the attribute spread copies every existing channel key forward and there was no way to express removal. Inbox now always passes `raw` (always `undefined`), so an affected template heals on its next edit.
- **Did not touch email's `raw.subject`.** It is a legitimate legacy storage format. It is exposed to the same non-interpolation, but conditionally (only templates already in raw storage) and long-standing — a separate decision, not this fix.

## Key Numbers Discovered This Session

- `raw.title` introduced **2026-02-16** in `7b7ee0d5` (PR #118, C-16715).
- First **published** build carrying it: `0.0.0-canary-20260216124618`, published 12:47:21Z. `0.6.0` and `canary-20260210155856` are clean; `0.7.0` and everything after are poisoned.
- Studio pinned that canary the same day (frontend `133e9abcf`, 13:57Z) — inside unrelated PR #4912 (C-16714).
- PR #118 merged 14:06:29Z, i.e. **~80 min after** the canary was published from its branch, and ~9 min after studio already shipped it.
- **175 days** affected (2026-02-16 → 2026-08-10).
- Test suite: **119 files / 2925 tests** pass. Build reproducible — dist sha256 `bff877b3abcfac061c1488d077046e53e6b498b87d8dafca786e9d09df371ecb` before and after a clean rebuild.

## Conditional Logic Established

- **IF** a channel node has both `raw.title` and a sibling `meta.title` → the renderer uses `raw`, un-interpolated. **THEN** a static title still renders correctly and only a variable-bearing title breaks. This is why 175 days passed unnoticed, and why manual testing on PR #118 legitimately looked green.
- **IF** `raw.title === meta.title` → designer-authored poisoning (both written from one value). **IF they differ** → someone set `raw` deliberately via API; do not touch it. This is the predicate proposed for the backend backfill.
- **IF** the fix ships without the `updateElemental` half → new saves are clean but the ~175 days of existing templates stay broken forever.

## Files Created or Modified

- `packages/react-designer/src/lib/utils/getTitle/preserveStorageFormat.ts` — inbox branch no longer returns `raw`.
- `packages/react-designer/src/lib/utils/updateElemental/updateElemental.ts` — an attribute explicitly `undefined` now deletes.
- `packages/react-designer/src/components/TemplateEditor/Channels/Inbox/Inbox.tsx` — always passes `raw` so a stale one is dropped.
- `packages/react-designer/src/lib/utils/getTitle/preserveStorageFormat.test.ts` — 4 stale `raw` expectations removed; 2 regression tests added.
- `packages/react-designer/src/lib/utils/updateElemental/updateElemental.test.ts` — 3 tests for delete-on-`undefined`.
- `.changeset/inbox-raw-title-shadow.md` — patch.

## What the NEXT Session Should Do

1. **Merge #196 first**, then `trycourier/frontend#5365` — that PR vendors bytes from this unmerged branch and they exist nowhere else until this lands.
2. Add the missing repo secret in courier-web or its send suite silently skips: `COURIER_E2E_TEMPLATE_V2_VARIABLE_TITLE_ID = nt_01kzq3kxnbfk7aejbk46394e25`.
3. Decide on the backend backfill (plan written, nothing built) — see the backend handoff.

## Open Questions Requiring User Input

- **Does removing `raw.title` reintroduce C-16715?** That ticket's changeset claims meta-only titles were not rendering. The ticket has an **empty description**, so there is no repro to replay. Everything measurable says meta-only renders today (live dev send returned `INTERPOLATED-OK`; `getTitle` has recursed into channel `elements` since `bfabe9f8f`, 2024-09-05). The pre-#118 code is byte-for-byte what this PR restores. The original author no longer works here, so this needs a second opinion rather than a question to them.
- Whether to backfill already-delivered inbox messages, whose titles are stored rendered.

## Assumptions That Need Validation

- That `raw.title === meta.title` is a safe fingerprint for designer-authored poisoning. Verified on 4 real templates (2 dev, 1 prod, 1 seeded), not exhaustively.
- That no customer relies on `raw.title` as an intentional inbox override. Nothing in the backend reads it as one — `slotRenderer("title")`, cited in #118's rationale, serves legacy handlebars slot templates and never sees elemental `raw`.

## What NOT to Re-Read

- The npm/canary archaeology — the dates above are final and were checked against published tarballs, not inferred from the vendored bundle (an earlier pass mis-dated this to 2026-07-24 by reading the vendored dist; that was when vendoring replaced npm pins, not when the bug shipped).
- Whether single vs double braces matter for rendering: both interpolate through the real send pipeline. Double braces are required for the **designer**, whose variable regex is `/\{\{([^}]*)\}\}/g`.

## Files to Load Next Session

- `packages/react-designer/src/lib/utils/getTitle/preserveStorageFormat.ts`
- `packages/react-designer/src/lib/utils/updateElemental/updateElemental.ts`
- Backend: `send/worker/provider-render/elemental/utils.ts` (`getTitle`), `send/worker/provider-render/elemental/get-channel-overrides.ts`
