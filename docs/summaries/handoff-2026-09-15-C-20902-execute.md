# C-20902 — HTML block variables don't resolve in preview

Date: 2026-09-15
Branch: `geraldosilva/c-20902-html-block-variables`
Linear: [C-20902](https://linear.app/trycourier/issue/C-20902/shi-one-html-variables-dont-resolve-on-preview) (parent SUP-765, customer SHI One)

## What was wrong

SHI One's order-confirmation template puts its markup in an **HTML block** in the
design editor. Every `{{data.*}}` in that block rendered literally in Preview and
Test, while a test send resolved them fine — the backend evaluates the template,
the editor did not.

Two places caused it:

- `components/utils/extractVariablesFromContent.ts` listed `html: []` in
  `EXTRACTABLE_PROPERTIES` ("HTML content is unpredictable"), so an HTML block's
  variables never reached `useVariables().usedVariables`. Studio's Preview and
  Test sidebar therefore said *"No variables in this template"* and had no values
  to resolve against.
- `components/extensions/HTML/HTMLComponent.tsx` injected `code` verbatim through
  `dangerouslySetInnerHTML`, so nothing was substituted even for variables whose
  value was already known.

Studio's **code editor** (raw `raw.html` mode) was never affected — that path is
studio's own (`useEmailCodeMode` → `extractVariablesFromHtml` /
`replaceVariablesInHtml`) and already scanned the markup. Pasting the same HTML
into the code editor resolved correctly, which is what made the bug look
workspace-specific at first.

## The fix

- **`components/utils/htmlBlockVariables.ts` (new)** — `extractVariablesFromHtmlString`
  and `renderVariablesInHtmlString`. Chips in `show-variables` mode (markup mirroring
  `VariableChipBase`'s classes, so it inherits the chip styling), plain values in
  `wysiwyg`. Values are HTML-escaped.
- **`extractVariablesFromContent.ts`** — html nodes now route through that scanner.
- **`HTMLComponent.tsx`** — renders through the resolver, tracking the view-mode
  toggle via the `variableViewModeChanged` transaction meta, same as `VariableView`.

**Handlebars is deliberately not emulated.** Block helpers (`{{#if}}`, `{{#each}}`
and closers), loop-scoped refs (`{{this.x}}`, `{{$.x}}`) and triple-brace escapes
(`{{{data.x}}}`) are left as literal text, because only the backend evaluates them
and a half-right client render would be worse than none. The triple-brace case is
why `VARIABLE_PATTERN` carries lookarounds — a plain `\{\{([^{}]+)\}\}` matched
*inside* `{{{...}}}` and chipped it. A unit test caught that.

## Verification

- `pnpm --filter @trycourier/react-designer test` — 3133 passed, 135 files.
- `eslint` clean on the changed files; `pnpm build` clean.
- Live-tested in studio on `localhost:3000` against a vendored build of this
  branch: HTML-block variables list in Preview and Test, resolve to their value
  with *Show variables* off, render as blue/amber chips with it on, and survive a
  page reload. Helpers stayed literal. No console errors.

## Downstream

Studio consumes this via the vendored dist, so it needs
`bin/vendor-courier-designer.sh` re-run in `frontend` after this merges and
publishes — see the frontend PR for C-20902, which vendors this branch.
