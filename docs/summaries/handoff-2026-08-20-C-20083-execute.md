# Session Handoff: Disable the Playwright e2e job on CI

**Date:** 2026-08-20
**Session Duration:** one short session
**Session Focus:** C-20083. The `e2e-test` job in `check-pull-request.yml` ran ~20 min per PR and failed flakily against the dev app, blocking merges without catching real regressions. Gate it off, matching how `full-cycle-e2e-test` was already handled.
**Context Usage at Handoff:** low

## What Was Accomplished

1. `if: false` on the `e2e-test` job, with a comment naming the ticket, the reason, the local command, and how to re-enable → `.github/workflows/check-pull-request.yml:59-66`. The job body is left intact so re-enabling is a one-line revert.
2. Documented the state in the Testing section → `CLAUDE.md:178-181`, so the next session does not assume Playwright is a CI gate.

`unit-test` is untouched and remains the only test gate on PRs.

Branch `geraldosilva/c-20083-disable-e2e-for-courier-designer`, branched from `main` at `ec65d9fb`.

## Exact State of Work in Progress

Nothing mid-stream.

## Decisions Made This Session

**`if: false` rather than deleting the job or moving it to a schedule.** This is the precedent already set in this file by `full-cycle-e2e-test` (C-19520): the steps, the caching, and the env wiring stay on disk, so re-enabling costs one line instead of a reconstruction. A `workflow_dispatch`/nightly trigger would keep the flakiness, just on a different clock — and nobody is watching that clock. Local runs stay the intended path (`pnpm --filter @trycourier/react-designer test:e2e`).

**Job removed as a check, not renamed.** With `if: false` the job reports as skipped rather than disappearing, which keeps any branch-protection rule that names `e2e-test` satisfiable instead of permanently pending.

**No changeset.** CI- and docs-only change; nothing under `packages/*` moves, so the release rule in `CLAUDE.md` does not apply.

## Related

- Prior art in the same file: `full-cycle-e2e-test`, disabled under C-19520
- Linear: https://linear.app/trycourier/issue/C-20083
