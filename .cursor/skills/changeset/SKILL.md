---
name: changeset
description: >-
  Analyze branch changes and create a Changesets release note in .changeset/.
  Use when the user asks to create/add a changeset, bump a package version, or
  prepare a release note for the courier-designer monorepo.
---

# Changeset

Create a [Changesets](https://github.com/changesets/changesets) release note for
the current branch's changes, then write it to `.changeset/`.

## Workflow

1. **Inspect the changes** against the base branch (`main`):

```bash
git diff --stat main...HEAD
git diff main...HEAD
```

2. **Determine affected packages.** Only published packages get a changeset.
   - `@trycourier/react-designer` — the only publishable package.
   - Ignored / private (never include): `editor-dev`, `nextjs-demo`, `@trycourier/vue-designer`.
   - If the changes touch **only** ignored packages, root config, CI, or repo
     docs (and not the published library), tell the user no changeset is needed
     instead of creating an empty one.

3. **Choose the bump level:**
   - `major` — breaking changes, removed features, changed/renamed public APIs or props.
   - `minor` — new features or enhancements (backwards compatible).
   - `patch` — bug fixes, refactors, small improvements, docs.
   - When genuinely uncertain between minor and patch, prefer `minor`.

4. **Write a brief description** (1–2 sentences) covering *what* changed and
   *why*, in the imperative/present tense. This becomes the changelog entry.

5. **Create the file** at `.changeset/<unique-slug>.md`. Use a short random
   three-word kebab slug (e.g. `swift-lions-jump.md`) and confirm the name is not
   already taken in `.changeset/` before writing.

6. **Show the created file path and its content** to the user.

## File format

```markdown
---
"@trycourier/react-designer": minor
---

Brief description of what changed and why.
```

- The frontmatter key is the exact package name; the value is the bump level.
- List multiple packages on separate lines only if more than one publishable
  package actually changed (rare in this repo).

## Example

Branch adds a `colorScheme` prop to `TemplateEditor`:

`.changeset/quiet-pandas-sing.md`

```markdown
---
"@trycourier/react-designer": minor
---

Add dark mode support via a `colorScheme` prop on `TemplateEditor` and related components.
```

## Notes

- This repo uses `pnpm`. Avoid the interactive `pnpm changeset` prompt — write
  the file directly so the result is deterministic.
- Base branch is `main` (`.changeset/config.json`).
