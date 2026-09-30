# Handoff — C-20919 follow-up: partial blocks (brand snippets)

## Problem

After #216, v1 templates that wrap their body in brand snippets could not be
published or sent from the v2 designer. Studio showed "4 errors blocking
publish" on `nt_01m3t3djn7enbtb4td47kc8p63` (reported by Seth).

`{{#> width_setter }}…{{/width_setter}}` — a partial block — was classified as
a block helper named `>`, raising `unknown-helper` ("`>` is not a helper the
renderer knows") and `mismatched-close` on the closer. Plain `{{> name}}`
partials were already accepted.

## Fix

- `classifyExpression`: `{{#> name …}}` is a `blockOpen` named `name` with
  `partialBlock: true`, so the closer matches.
- `validateHandlebars`: `unknown-helper` skips partial blocks. Partial names are
  never checked — they resolve at send time.
- Test: `lib/utils/handlebars/__tests__/partialBlock.test.ts`.
- editor-dev Handlebars page: "Load snippet partials" toggle with a blocking count.

## Verification

- Unit suite green (4601 passed); build clean.
- editor-dev on localhost: snippet fixture reports 0 blocking issues.
- Studio localhost, dist vendored, reported template in one HTML block: no issue pill, Publish enabled, Preview & Test send enabled. Publish and send not clicked.

## Notes

- A block split across separate text elements is still blocking, for `{{#if}}`
  and partial blocks alike — the send compiles each element on its own.
