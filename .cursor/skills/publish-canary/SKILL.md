---
name: publish-canary
description: >-
  Publish a canary release of courier-designer from the current branch.
  Use when the user asks to publish a canary, create a canary release,
  or test an npm package version from a feature branch.
---

# Publish Canary

Triggers the `publish-canary.yml` GitHub Actions workflow on the `trycourier/courier-designer` repo using the current git branch.

## Steps

1. Get the current branch name:

```bash
git -C /Users/geraldo/git_workspaces/courier/courier-designer rev-parse --abbrev-ref HEAD
```

2. Trigger the workflow via `gh`:

```bash
gh workflow run publish-canary.yml \
  --repo trycourier/courier-designer \
  --field branch=<BRANCH_FROM_STEP_1>
```

3. Confirm the run was queued:

```bash
gh run list --repo trycourier/courier-designer --workflow=publish-canary.yml --limit 1
```

4. Report the run URL to the user so they can monitor progress.

## Notes

- The branch must be pushed to the remote before triggering.
- If the branch has unpushed commits, warn the user and offer to push first.
- The workflow publishes to npm under a canary tag (e.g. `0.1.0-canary.abc1234.0`).
