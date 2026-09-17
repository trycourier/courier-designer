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

## Not done

- No UI surface lists a field's validation warnings; they are on the chip's `title`
  only.
- `format`, `translate`/`t`, link-tracking and partial helpers are pass-throughs in
  preview and reported via `approximated`; nothing consumes that signal yet.
- The `variables` prop doubles as preview data. A dedicated test-data payload was the
  ticket's second OPEN question and is still open.
