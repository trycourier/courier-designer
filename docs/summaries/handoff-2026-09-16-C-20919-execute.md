# C-20919 — Handlebars syntax support in the designer

Date: 2026-09-16
Branch: `geraldosilva/c-20919-handlebars-syntax-support-in-the-designer`
Linear: [C-20919](https://linear.app/trycourier/issue/C-20919/handlebars-syntax-support-in-the-designer) (parent SUP-762, customer Float)

## What was wrong

The ticket describes handlebars as "just opaque text" in the editor. It is worse
than that: **the editor destroyed it on entry.**

`extension-kit.ts` always installs `VariableInputRule`, whose `{{` rule deletes the
literal braces and inserts an empty `variable` chip. That is right for
`{{data.name}}`. For anything else the following characters land in the document
*after* the chip, so the chip stays empty, `VariableChipBase.handleBlur` deletes it
(`trimmedValue === "" → onDelete()`), and the author is left with `#if x}}`. The
conditional silently stops being a conditional and the damage is auto-saved — I
reproduced this against dev `template1`, whose stored subject became `#if x}}`.

Paste was never affected: `VariablePaste.splitTextWithVariables` keeps a
non-variable match as literal text. The corruption was typing-only.

Underneath that, every `{{...}}` was matched by `/\{\{([^}]*)\}\}/` and validated
with `isValidVariableName`, so `{{#if (condition data.foo "==" "bar")}}` came out as
a malformed *variable*. That regex also mis-reads a quoted argument containing `}}`
and a triple-stache.

## The fix

**Parsing core** — `lib/utils/handlebars/`:

- `scanHandlebars.ts` — quote-aware scanner; handles `"}}"` inside an argument and
  `{{{ }}}`.
- `classifyExpression.ts` — `variable` / `helperCall` / `blockOpen` / `blockElse` /
  `blockClose` / `blockInverseOpen` / `partial` / `comment`, plus an argument
  tokenizer that keeps `(sub expressions)` intact.
- `helperRegistry.ts` — the 56 helpers mirrored from backend
  `handlebars/helpers/universal/index.ts` (+ its `array`/`math`/`string` sub-indexes),
  handlebars built-ins, and `condition`'s operators from `condition.ts`.
- `validateHandlebars.ts` — unterminated braces, unknown helper and bad `condition`
  operator are **errors**; block-structure problems are **warnings**, because the
  backend interpolates per elemental element and authors do legitimately open a block
  in one element and close it in the next.
- `segmentText.ts` — the single splitter all parse sites now share.

**Compatibility rule worth knowing:** a multi-token expression is only a helper call
when its first token is a *registered* helper. `{{user. firstName}}` stays an invalid
variable rather than becoming a call to a helper named `user.`, which is what keeps
the pre-existing variable-validation behaviour intact.

**Typing** — `extensions/Variable/handlebarsEscape.ts`: a ProseMirror
`handleTextInput` plugin that restores the literal `{{` when a sigil (`#/^>!`) is
typed into a fresh empty chip, and folds a still-open chip back into `{{…}}` when a
`}}` is completed (which is what catches `{{else}}`, having no sigil).

**Node** — `extensions/HandlebarsExpression/`: inline atom storing the occurrence in
`raw` and re-emitting exactly that, so API-authored handlebars round-trips
byte-for-byte. Violet monospace chip (variables keep their amber/blue chip);
double-click to edit, with helper autocomplete from the registry.

**Preview** — `renderPreview.ts` / `previewHelpers.ts` / `renderElementalPreview.ts`.
New public `TemplateEditor` prop `variableViewMode`; `wysiwyg` renders each field
through a bundled `handlebars` (new dependency) against the `variables` prop.

## Two things that will bite the next person

- **Preview forces `readOnly`.** Rendered output must never be written back over the
  template — that is the same class of bug as the one this ticket fixes. `readOnly`
  already disables auto-save, so `TemplateEditor` ORs it with
  `variableViewMode === "wysiwyg"`.
- **`variableViewMode` is threaded as a prop, not an atom.** `TemplateEditor` and the
  channel components do **not** share a Jotai store — an atom written in the former is
  invisible in the latter (verified: same atom instance `atom41`, different store).
  The first cut used an atom and silently did nothing. `useHandlebarsPreviewData` now
  takes both inputs as arguments. `variableViewMode` was previously a dead prop:
  `EmailEditor` accepted it, but nothing passed it down.
- **The editor stores a text block as one `string` part per formatting change**, so
  `{{#if}}`, its body and `{{/if}}` sit in different parts. `renderElementalPreview`
  joins a run whose parts are individually unbalanced before rendering — otherwise
  every branch renders at once. It only joins when needed, so per-part formatting
  survives in the common case.

## Verification

- Unit: 3242 passed / 0 failed, including 94 handlebars tests. `roundTrip.test.ts`
  drives the real conversion pipeline both ways over 11 shapes (Float subject, nested
  blocks, braces-in-argument, triple-stache, unknown helper) asserting byte equality.
  `handlebarsEscape.test.ts` types character-by-character through `handleTextInput`
  the way ProseMirror does — typing a whole string in one insert bypasses input rules,
  which is why browser-automation "type" is not a valid proxy here.
- Live, dev `geraldo`/`template1`: wrote the Float subject and a body with
  `{{#if}}`/`{{else}}`/`{{truncate}}` via the API, opened the editor, let it autosave,
  and re-read with `version: "latest"` — subject and body byte-identical, version
  unchanged. Preview toggled both branches: subject `This is bar!` ↔ `This is not bar`,
  body `you are a VIP` ↔ `welcome`.
- Harness: new `/handlebars` page in `editor-dev` with preview and branch toggles.

## Discovery and signature help (added after first review)

The first cut shipped helper autocomplete only *inside* an existing expression chip,
which meant there was no route from "I want a helper" to having one — `{{` offered
variables only (`VariableChipBase.allSuggestions`), and the `{.}` toolbar button
inserts the same empty `variable` node (`TextMenu.tsx:193`). That missed the ticket's
discovery criterion.

- `{{` and the toolbar button now list helpers under a **Helpers** heading beneath the
  variables, each labelled with its parameters. Picking one calls `onSelectHelper`,
  and `VariableView` swaps the `variable` node for a `handlebarsExpression` carrying
  `autoEdit`, so the new chip opens ready for arguments. A block helper is inserted as
  `{{#name }}` so the template stays balanced.
- `helperSignatures.ts` holds parameter lists read from the backend helpers' own
  `assertHandlebarsArguments` calls and function signatures. **A helper whose arguments
  could not be verified from source is absent rather than guessed** — the autocomplete
  still lists the name, it just gets no hint.
- `SignatureHint` renders the parameter list above the chip with the active parameter
  marked. `activeParamIndex` walks the text before the caret, treating a quoted string
  or a `(sub expression)` as one argument.

## Known issue: fast typing into a fresh chip

Typing `{{` then more characters *very* fast can leave those characters in the document
next to the chip rather than inside it, because `VariableChipBase` focuses its editable
span in a `requestAnimationFrame` after mount. The visible consequence in the new flow
is that Enter accepts the unfiltered first helper (`abs`) instead of the one that was
typed. This is a pre-existing race in the variable chip, not introduced here, but the
helper list makes it easy to hit. Fixing it properly means focusing the chip
synchronously on insertion, or routing the input rule through a NodeSelection.

## Strict scope: lazy paths in `path` and `filter` (added after first review)

Studio content carries `scope: "strict"`, and under it the send's variable handler is
rooted ABOVE `data` — `{ ...systemVariables, profile, data }`. `previewHelpers`'
`resolveVariablePath` merged `root.data`'s own keys onto the root for every helper, so
`(path "name")` and `(filter "data" "name" …)` found a value in preview where the send
finds `undefined` and throws. The author saw a rendered "no match" and no error; the
send came back UNDELIVERABLE with `CONTAINS Eval Error: Left operand cannot be
undefined or null.`

The merge is now opt-in and only `var` / `inline-var` take it, because their fallback
is not a fallback at all: an unresolved `{{var "name"}}` returns the literal
placeholder `{name}`, which a later, data-scoped substitution pass fills in. `path`,
`get-list-items` and `filter` have no second pass, so they must come back undefined.
`$`-anchored paths never take the merge in either pass.

Pinned against five real `/send` runs on dev (`scope: "strict"`, data
`{ name: "geraldo", quantity: 1, items: [{ n: "a" }] }`):

| expression | send |
|---|---|
| `{{var "name"}}` / `{{var "data.name"}}` | `geraldo` |
| `{{var "$.name"}}` | `{$.name}` |
| `{{path "name"}}` / `{{name}}` | empty |
| `{{path "data.name"}}` / `{{path "$.data.name"}}` / `{{data.name}}` | `geraldo` |
| `{{add (path "quantity") 1}}` | throws `undefined is NaN` |
| `{{add (path "data.quantity") 1}}` | `2` |
| `(filter "data" "name" "CONTAINS" "ger")` | throws `CONTAINS Eval Error: …` |
| `(filter "data" "data.name" "CONTAINS" "ger")` | true |
| `(get-list-items "items")` / `"data.items"` | empty / one item |
| inside `{{#each data.items}}`: `path "n"` | `a` — the each scope still resolves |

Those are the F-013 rows in `sendParity.test.ts`.

## `unscoped-path`: catching the strict-scope mistake at edit time

The preview fix above still only fires when the data happens to exercise the
expression. The failure is static: under strict scope a bare path resolves against
the variables root, so `(path "name")` is undefined on EVERY send. `validateHandlebars`
now reports it as `unscoped-path`.

- Fires on `(path "p")`, `(get-list-items "p")` and `(filter "<not profile>" "p" …)`
  when `p` is a quoted literal that does not start with `$`/`@` and whose first
  segment is not a root namespace. Not on `var` / `inline-var`, which have the
  second substitution pass behind them.
- **`STRICT_ROOT_KEYS` is the backend's `TEMPLATE_ROOT_KEYS` plus the strict system
  variables, twelve names — not the six the variable picker shows.** Verified on dev:
  `(path "courier.environment")` renders "production", `(path "datetime.year")` the
  year, and `tenant` is deliberately reachable (C-20370). A shorter list flags working
  expressions.
- Blocking where the renderer throws on the `undefined`: `CONTAINS` / `NOT_CONTAINS`
  ("Left operand cannot be undefined or null") and the math helpers ("undefined is
  NaN"). Warning everywhere else — other filter operators just evaluate false
  (`IS_EMPTY` true, `NOT_EMPTY` false) and a plain `path` renders empty. The send
  still delivers in those cases, so it must not gate Publish.
- Silent inside `{{#each}}` / `{{#with}}`, where a bare path hits the block context
  first. `{{#if}}` does NOT rebase the context and is not exempt.

### `CONTEXT_DEPENDENT_CODES` — why the code needs its own escape hatch

Whether the issue is real depends on the blocks AROUND the occurrence, and three
call sites validate a span on its own, where the block stack is empty. Those sites
must exclude the code and take it from a field-level pass instead — exactly the
dance `BLOCK_STRUCTURE_CODES` already does. `segmentText` folds it in by start
offset; the chip view reads it from `checkFieldStructure` into a new `fieldNotice`
(kept apart from `fieldIssue`, which forces red).

One code now carries two severities, so `HandlebarsIssue` grew an optional
`sendSeverity`, and `severityOfIssue(issue)` is the accessor to prefer over
`severityForCode(code)` wherever a whole issue is in hand. It is exported from the
package for hosts that gate on severity.

Run against the real draft of `nt_01m3ct7j50fzs9e7m11bk6csnq`: nine findings, the
two blocking ones being `(filter "data" "name" "CONTAINS" …)` and
`{{add (path "qty") 1}}`, and `path "data.created_ms"` correctly quiet. No false
positives.

## Not done

- No UI surface lists a field's validation warnings; they are on the chip's `title`
  only.
- `format`, `translate`/`t`, link-tracking and partial helpers are pass-throughs in
  preview and reported via `approximated`; nothing consumes that signal yet.
- The `variables` prop doubles as preview data. A dedicated test-data payload was the
  ticket's second OPEN question and is still open.
