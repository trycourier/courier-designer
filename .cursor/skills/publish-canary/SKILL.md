---
name: publish-canary
description: >-
  Publish a canary release of courier-designer from the current branch.
  Use when the user asks to publish a canary, create a canary release,
  or test an npm package version from a feature branch.
---

# Publish Canary

Triggers the `publish-npm.yml` GitHub Actions workflow (canary job) on the `trycourier/courier-designer` repo using the current git branch. Publishing uses npm Trusted Publishing (OIDC) on Node 24 — no `NPM_TOKEN` secret required. Do not use `npm whoami` to verify OIDC; auth is validated at publish time.

## Steps

1. Get the current branch name and confirm it is pushed:

```bash
git rev-parse --abbrev-ref HEAD
git status -sb
```

If the branch has unpushed commits, push first:

```bash
git push -u origin HEAD
```

2. Trigger the workflow via `gh`:

```bash
gh workflow run publish-npm.yml \
  --repo trycourier/courier-designer \
  --ref <BRANCH_FROM_STEP_1> \
  --field branch=<BRANCH_FROM_STEP_1>
```

Use `--ref` to load the workflow from the feature branch. Once `publish-npm.yml` is on `main`, `--ref` can be omitted.

3. Confirm the run was queued and report the URL:

```bash
gh run list --repo trycourier/courier-designer --workflow=publish-npm.yml --limit 1
```

4. Report the run URL to the user so they can monitor progress.

## Notes

- The branch must be pushed to the remote before triggering.
- `--field branch` is the branch to **check out and publish**; `--ref` is the branch that **provides the workflow file**.
- On feature branches, both are usually the same branch name.
- The workflow publishes `@trycourier/react-designer` to npm under the `canary` tag (e.g. `0.7.0-canary.0`).
- npm Trusted Publisher must be configured for `trycourier/courier-designer` → `publish-npm.yml` (Node >=22.14, npm >=11.5.1).
