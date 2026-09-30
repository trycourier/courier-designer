# C-20919 — Handlebars syntax support in the designer

Date: 2026-09-16 (last updated 2026-09-29, second pass)
Branch: `geraldosilva/c-20919-handlebars-syntax-support-in-the-designer`
Linear: [C-20919](https://linear.app/trycourier/issue/C-20919/handlebars-syntax-support-in-the-designer) (parent SUP-762, customer Float)

## What was wrong

The ticket describes handlebars as "just opaque text" in the editor. It was worse than
that: **the editor destroyed it on entry.**

`extension-kit.ts` always installed `VariableInputRule`, whose `{{` rule deletes the
literal braces and inserts an empty `variable` chip. That is right for `{{data.name}}`.
For anything else the following characters landed in the document *after* the chip, so
the chip stayed empty, `VariableChipBase.handleBlur` deleted it, and auto-save persisted
the wreckage — `{{#if (condition data.foo "==" "bar")}}` became
`#if (condition data.foo "==" "bar")}}`. Reproduced on dev `geraldo`/`template1`, whose
stored subject became `#if x}}`. Paste was never affected; the corruption was
typing-only.

Separately, all four parse sites matched `/\{\{([^}]*)\}\}/` and validated with
`isValidVariableName`, so a block helper was reported as a malformed *variable*. That
regex also mis-read a quoted argument containing `}}` and a triple-stache.

## The shape of the fix

**A parsing core** under `lib/utils/handlebars/` that every surface shares:
`scanHandlebars` (quote-aware, handles `"}}"` inside an argument and `{{{ }}}`),
`classifyExpression` (variable / helperCall / blockOpen / blockElse / blockClose /
blockInverseOpen / partial / comment, with an argument tokenizer that keeps
`(sub expressions)` and `[segment literals]` intact), `helperRegistry` (56 helpers
mirrored from backend `handlebars/helpers/universal/`), `helperSignatures`,
`validateHandlebars` and `segmentText` — the single splitter all parse sites now use.

**A typing plugin** — `extensions/Variable/handlebarsEscape.ts` — restores the literal
`{{` when a sigil (`#/^>!`) is typed into a fresh empty chip, and folds a still-open chip
back into `{{…}}` when a `}}` completes, which is what catches `{{else}}`, having no
sigil.

**Its own node** — `extensions/HandlebarsExpression/` — an inline atom storing the
occurrence in `raw` and re-emitting exactly that, so API-authored handlebars round-trips
byte for byte. Variables keep their amber/blue chip; expressions get a violet monospace
one, editable on double-click with autocomplete and a signature hint.

**A preview** — `renderPreview.ts` / `previewHelpers.ts` / `renderElementalPreview.ts` —
behind the `variableViewMode` prop, rendering each field through a bundled `handlebars`
against the preview data.

**Discovery**, added after the first review: `{{` and the `{.}` toolbar button list
helpers under their own heading with parameters, picking one swaps in a
`handlebarsExpression` carrying `autoEdit`, and a block helper is inserted as `{{#name }}`
so the template stays balanced. `helperSignatures.ts` is read from the backend helpers'
own `assertHandlebarsArguments` calls — **a helper whose arguments could not be verified
from source is absent rather than guessed**, so it is listed without a hint.

A compatibility rule worth knowing: a multi-token expression is only a helper call when
its first token is a *registered* helper. `{{user. firstName}}` stays an invalid variable
rather than becoming a call to a helper named `user.`, which is what keeps the
pre-existing variable-validation behaviour intact.

## The rule the whole thing is built on

**The preview and the validator model the renderer, not handlebars.** Every divergence
below was measured against a real dev send and pinned in `sendParity.test.ts`; when you
change any of it, measure first and pin the row. Four consequences are worth carrying in
your head.

**The renderer's argument assertion counts the options hash.**
`assertHandlebarsArguments(args, "context")` computes `missing = argNames.slice(args.length)`
with the hash still in `args`, so helpers that stock handlebars rejects on arity quietly
do something instead: `{{#with}}` with no argument takes the else branch and ignores
arguments past the first, `{{#contains data.msg}}` takes the hash as its substring and so
never matches, `{{#if data.x includeZero=true}}` is a one-argument `if`. A preview using
stock handlebars threw where the send renders — and Publish & Test reported a send
failure that would not happen.

**Assertions are looser than they look.** `assertIsNumber` is only an `isNaN`, so a
numeric string passes unconverted: `{{divide 10 "0"}}` is `Infinity`, `{{mod 10 "0"}}` is
`NaN`, and `{{add "42" 8}}` concatenates. The zero check that follows is strict on the raw
value, so only a real `0` throws.

**A body is rendered once; a meta title is rendered twice.** `{{data.tpl}}` whose value is
the string `{{data.name}}` delivers that string literally — nothing resolves it a second
time, so the editor must not parse rendered text back into chips.
`renderElementalPreview` marks the nodes it could not render (`PREVIEW_ERROR_KEY`, set for
the whole subtree) and `convertElementalToTiptap` parses chips only inside those; the gate
is `convertNode`, not any channel component, so a new channel or text path inherits it. A
title, by contrast, is rendered and then its OUTPUT rendered again with the context scoped
to `data` (backend C-21161), which is what `renderTitlePreview` reproduces. Inbox and Push
lift `meta.title` into an h2 text element before converting, so that node carries
`PREVIEW_TITLE_KEY` to stay a title — without it those two channels silently fall back to
one pass, which is exactly the bug that came back in review.

**Strict scope is what Studio writes, and it changes where paths resolve.** Under
`scope: "strict"` the send's variable handler is rooted ABOVE `data`
(`{ ...systemVariables, profile, data }`), so `(path "name")`, `(get-list-items "name")`
and `(filter "data" "name" …)` resolve to nothing and the send throws, while a preview
that merged `data`'s keys onto the root rendered a value and flagged nothing. Pinned
against five dev `/send` runs with data `{ name: "geraldo", quantity: 1, items: [{ n: "a" }] }`:

| expression | send |
|---|---|
| `{{var "name"}}` / `{{var "data.name"}}` | `geraldo` |
| `{{var "$.name"}}` | `{$.name}` |
| `{{path "name"}}` / `{{name}}` | empty |
| `{{path "data.name"}}` / `{{data.name}}` | `geraldo` |
| `{{add (path "quantity") 1}}` | throws `undefined is NaN` |
| `{{add (path "data.quantity") 1}}` | `2` |
| `(filter "data" "name" "CONTAINS" "ger")` | throws `CONTAINS Eval Error: …` |
| `(get-list-items "items")` / `"data.items"` | empty / one item |
| inside `{{#each data.items}}`: `path "n"` | `a` — the each scope still resolves |

`var` is not an exception to this and is no longer modelled as one. An unresolved
`{{var "name"}}` renders the literal `{name}`, and `render-templates.ts` then scopes the
handler to `data` and runs `replace()` over the RENDERED TEXT, filling in every `{path}`
left in it. That second pass reaches a block's `content` string and a meta title but
**not** the `string` parts the designer saves text as, so in designer text a bare `var`
reaches the reader as `{name}`. Being a text pass it cannot rescue a sub-expression:
`{{add (var "quantity") 1}}` throws `{quantity} is NaN` in either surface, and handlebars
gives a helper no way to know it is being called as one. So the preview does what the
backend does — render with `var` never resolving through `data`, then run
`substituteDataVariables` over the output — and the surface is passed as an option
(`varDataFallback`, `varFallsBackToData`) by the two callers that already walk string
parts separately from a node's own `content`. Incidental and pinned:
`{{add (var "data.quantity") 1}}` renders **11**, not 2.

`unscoped-path` catches the strict-scope mistake at edit time rather than leaving it to
whatever data happens to be loaded. It is blocking where the renderer throws on the
`undefined` (`CONTAINS`/`NOT_CONTAINS`, the math helpers) and a warning where the send
still delivers, silent inside `{{#each}}`/`{{#with}}` — `{{#if}}` does not rebase the
context and is not exempt — and its `STRICT_ROOT_KEYS` is the backend's
`TEMPLATE_ROOT_KEYS` plus the strict system variables, twelve names, not the six the
variable picker shows. A shorter list flags working expressions:
`(path "courier.environment")` and `(path "tenant.name")` both render.

## Things that will bite the next person

- **Preview forces `readOnly`.** Rendered output must never be written back over the
  template — the same class of bug this ticket fixes. `TemplateEditor` ORs `readOnly`
  with `variableViewMode === "wysiwyg"`.
- **`variableViewMode` is a prop, not an atom.** `TemplateEditor` and the channel
  components do not share a Jotai store — an atom written in the former is invisible in
  the latter (verified: same atom instance, different store). The first cut used an atom
  and silently did nothing.
- **A text block is stored as one `string` part per formatting change**, so `{{#if}}`,
  its body and `{{/if}}` sit in different parts. `renderElementalPreview` joins a run
  whose parts are individually unbalanced before rendering — otherwise every branch
  renders at once — and only when needed, so per-part formatting survives the common
  case. A block helper that spans runs is saved as one markdown string, because the
  renderer compiles each part alone and the split shape fails the send;
  `collectTemplateIssues` reports an already-saved split run as `split-block`.
- **One issue code can carry two severities.** Whether an issue is real often depends on
  the blocks AROUND the occurrence, and three call sites validate a span on its own with
  an empty block stack. Those exclude `CONTEXT_DEPENDENT_CODES` and take the verdict from
  a field-level pass instead — the same dance `BLOCK_STRUCTURE_CODES` already does. Prefer
  `severityOfIssue(issue)` over `severityForCode(code)` wherever a whole issue is in hand;
  the latter reads a blocking case as a warning.
- **Where the validator deliberately stays quiet.** An operator or a path that arrives in
  the data cannot be judged statically, a dotted `@` path reads the data frame the renderer
  seeds from every root key, a `[...]` segment literal may hold a space, `{{#*inline}}` is
  a decorator, and a dotted argument-less block name goes through `blockHelperMissing`. All
  of these render at send, and each one blocked Publish until it was carved out. A BARE
  unknown block name is still an error — nothing distinguishes it from a typo.
- **Known race, pre-existing:** typing `{{` then more characters *very* fast can leave
  those characters beside the chip, because `VariableChipBase` focuses its editable span in
  a `requestAnimationFrame` after mount. The helper list makes it easy to hit; the visible
  symptom is Enter accepting the unfiltered first helper. Fixing it properly means focusing
  the chip synchronously on insertion, or routing the input rule through a NodeSelection.
- **The chip cannot show the bare-`var` warning.** `HandlebarsExpressionView` renders in
  text blocks and in the subject editor alike and cannot tell which surface it is in;
  flagging a bare `var` would be wrong on every subject, where the second pass does run.
  The issues list, code-mode markers and the Publish gate are all correct without it.

## Two races around a chip taking focus

Three separate bugs turned out to be the same thing, and a fourth is still open,
so it is worth stating plainly: **a chip focuses its own contenteditable a frame
after it is inserted, and until that focus lands the keystrokes belong to the
document.** Anything that assumes otherwise works at automation speed and fails
at human speed, or the reverse.

- `{{` inserts a variable chip. The `#` of `{{#if x}}` reaches the DOCUMENT if it
  arrives before the focus and the CHIP if it arrives after. Only the document
  side converted to an expression, so a burst of keystrokes gave a block chip and
  ordinary typing gave a variable chip named `#if data` — the same template,
  classified by timing. `handlebarsEscape` handles the document side;
  `convertVariableChipToExpression` is the chip's, and both now run.
- The chip that results opens in edit mode, and its span focuses a frame later
  too. Until then, characters typed after it land in the field. The canvas hid
  this by focusing quickly; the header inputs did not. The document fills an
  `autoEdit` expression chip the way it already filled a variable one.
- Entering edit focused the span synchronously but moved the caret in a
  `requestAnimationFrame`, so a keystroke in between went to the start: `{{#if`
  became `i#f`. The caret is now placed in the same turn as the focus.
- `autoEdit` is what covers that gap, and it is easy to read as merely "open
  this chip". While the flag is set, `handlebarsEscape` routes keystrokes INTO
  the chip; the moment it is cleared, anything still in flight lands in the
  document. The expression chip cleared it a microtask after opening — before
  its span had focus — so the gap was unguarded, and typing ` {{#if x}}` in the
  In-app sidebar (whose chips focus more slowly than the canvas's) produced a
  `{{#}}` chip with `if x` beside it. The flag now lives until the commit clears
  it, which is what the variable chip already did. **Do not clear `autoEdit` on
  open.**
- Still open, and pre-existing: `VariableChipBase` focuses its span in a
  `requestAnimationFrame` after mount, so very fast typing into a fresh chip can
  still leave characters beside it. Fixing it properly means focusing
  synchronously on insertion, or routing the input rule through a NodeSelection.

The lesson for the next change here: a test that types a whole string in one
insert proves nothing about either path, and browser automation types faster than
a person. Drive keystrokes one character at a time, and say which side of the
focus you are testing.

## Issues on the canvas

`CanvasIssueGutter` draws a pill in the right gutter beside each block that has
issues, red where the send fails and amber where it only renders wrong, with
every issue for that block on hover. It is exported, because a host that mounts
`EmailEditor` in its own layout — which Studio does — cannot use the mount inside
`EmailLayout`.

What it needs from a host: a positioned ancestor spanning the canvas (the element
wrapping the email body with room to its right), and a mounted `EmailEditor`,
which populates the editor store the gutter reads. It measures rather than lays
out, so the email body keeps the width it renders at.

Three things it learned the hard way, all worth keeping:

- An `inset-0` overlay inside a scrolling container is only as tall as the
  client box, so every pill below the first screen was clipped. It takes the
  ancestor's full scroll height now.
- `left` comes from the white sheet (`.courier-editor-main`), not the ProseMirror
  element, whose padding put the pills over the email.
- The designer's `Tooltip` anchors Tippy to a span it wraps around its child, and
  a span around an absolutely positioned child collapses to nothing at the
  overlay's origin — which is where every tooltip opened. The pill is positioned
  by a wrapper OUTSIDE the tooltip for that reason.

`issuesWithoutCanvasHome(issues, channel)` is what a host's own list should
filter on, so an issue with a pill is not also a row in the header.

**Follow-up, deliberately not done:** `Tooltip` should forward a ref to its child,
or take a `className`, so a caller can position the thing Tippy anchors to. Every
toolbar button in the designer uses that component, so it wants its own change and
its own review rather than riding along with a gutter fix. Until then, any
absolutely positioned tooltip child has to be wrapped the way the pill is.

## What the second audit changed

A second CDS audit on 2026-09-29 sent 221 cases and compared each against the
editor. Ten fixes came out of it, and they sharpened three rules worth stating.

**Arity is measured, never read off a signature.** The renderer's assertion
counts the options hash, so the hash fills one missing slot and what happens next
is each helper's own business: `{{default x}}` delivers, `{{add 5}}` dies. Every
helper the preview mirrors was probed for the shortest call that survives, and
`MINIMUM_ARGUMENTS` is that probe's output — the math family, the string family,
the path helpers. `each` is the only one so far that also breaks on too MANY
arguments. When you add a helper, probe it rather than reasoning about it.

**And a probe is only as good as when it reads.** `var` was briefly taken out of
`MINIMUM_ARGUMENTS` on a dev run that appeared to show `[{{var}}]` sending as
`[]`. It does not: it throws `#var path argument must be a string`, in all three
content shapes. The probe had read `/messages/{id}/history` BEFORE the error
event was written, so an empty error list was mistaken for an empty render. The
cost was real — the canvas drew no pill while Preview & Test disabled Send, and
the user saw the two disagree. If a helper ever looks like it "sends as empty",
read the history again after the send has settled.

**A literal is worth checking; a value is not.** A zero divisor, a time zone,
an ICU placeholder with nothing to fill it, a date format — all of them fail the
send and all are knowable from the template alone, but only when written as
literals. The same shapes arriving in the data are unknowable and stay silent.
The two format checks call the renderer's own formatter inside a try/catch
rather than re-implementing its grammar, which is why they agree with it.

**The preview is only as faithful as its weakest token.** Two of the misses were
inside otherwise-correct output: an ICU argument's style was dropped, so a
percentage previewed as a fraction; and `t`/`T` print the instant, which moves
when a date is shifted into a zone for formatting, so an epoch in a format
string differed by the author's own offset while the visible time agreed. Both
now match the send. If a preview disagrees with a send by a constant, suspect a
zone; if by a format, suspect a skeleton.

Two smaller things the audit settled. The validator judges a path by Handlebars'
ID grammar, not JSON identifier rules — a hyphen, a non-ASCII letter, a numeric
segment, a `[…]` literal and `/` as a separator all render at send. And an
element's `if` is JavaScript the send runs AFTER rendering handlebars into it,
so a mustache there is not a syntax error and a trailing comment is legal.

**The list's `loop` is the exception to that grammar**: it is compiled into
JavaScript, where `data.my-items` is a subtraction, so it keeps plain identifier
segments and has its own check in `List.types.ts`.

## Where a label is not in the document

The In-app buttons cost four bugs in one audit round, and all four come from the
same place: **a button's label is not always the text the document holds.**

- `inboxAction` keeps its label in an ATTRIBUTE over its own inline content. The
  sidebar reads the attribute, so typing on the canvas — which changes only the
  content — left the field showing the label from before. The email `button` has
  carried a plugin pushing content back into the attribute since the start;
  the action had none, and now installs the same one.
- `buttonRow` is an ATOM. Its two labels live only in attributes, so no chip node
  view ever sees them and the row drew them itself, splitting on a
  `{{([^}]+)}}` regex of its own. That regex knows nothing about handlebars, so
  `{{#if x}}` came out as raw braces, and the pills it did draw were static
  markup that never ran the validation effect — the same `{{test}}` was purple
  on the canvas and amber in the sidebar. It now splits with `segmentText` and
  judges each variable with `isAcceptedVariable`, tracking block scope across
  the label so `{{item}}` inside an `{{#each}}` in the same label is not put to
  the host.
- `inboxAction` accepted `(text | variable)*`, which does not include the
  expression node the sidebar builds a label from. ProseMirror does not fail on
  illegal content in `replaceWith`; it fits the node in wherever it IS legal. So
  a `{{#if x}}` typed in the sidebar left the action untouched and APPENDED a
  paragraph holding the chip, one more per edit, all of it saved to the draft.

The rule for the next one: before touching a label, ask whether it is an
attribute, inline content, or both, and whether the node's content spec can hold
what you are about to put in it. A schema that refuses a node is silent.

## What the third round changed

A run against Float's production templates and the PR review, all measured on
dev sends, cost five validator fixes and three changes around one helper. Two
of them are lessons, not just fixes.

**A helper family's NAME is not its registration site — twice now.** The first
time it was `helpers/email`, which belongs to the email LAYOUT template rather
than to an author's blocks. The second time it was
`handlebars/template/{slack,msteams}.ts`, which register `markdown`, `jsonnet`,
`javascript` and `markdown-quote` for the channel's own BLOCK template — not for
the text an author writes inside it. Read from `/messages/{id}/history`, Slack
`{{markdown data.s}}` is `Missing helper` exactly as it is on email. An author's
text compiles with universal + elemental on EVERY channel, so there are no
per-channel sets any more, and `CHANNEL_HELPERS` survives only as the list of
names never to SUGGEST. Both times the mistake was silent in the worst
direction: the designer said nothing and Publish stayed enabled on a template
that could not send.

**A quoted argument is not always a literal.** `var`/`inline-var` do
`variableHandler.replace("{" + path + "}")`, so `{{var "tenant.name"}}` resolves
like a legacy single-brace variable — the string IS the reference. Thirteen of
Float's production templates use it in a subject. Until this round it reached
neither the variable list a host builds its manual inputs from nor the host's
validator, so the subject could not be previewed and a bad name was never
flagged. `helperPathArguments` is now the one rule the chip and the reference
walk share, so the two cannot disagree about it again.

The rest, each pinned to a send: `{{.}}` is the current context and was being
blocked as a trailing dot; a block-only helper used as a plain mustache
(`{{conditional x}}`, `{{markdown-mark x}}`) is flagged, read off the signatures
rather than a second hand-kept list; `format` reads ONE value and drops the
rest; and a `null` among the elements threw and took the whole issue list with
it, which left a host gating Publish on `useTemplateIssues()` seeing nothing at
all — the walk now skips anything that is not an element, which is the failing
open the rest of that module promises.

**A dropped title now says why.** `handlebars/template/text.ts` drops a
single-value field for its default when an unresolved `{…}` survives, so a
subject of `[{{var "tenant.name"}}] Pay Co` sent without a tenant arrives as
`(no subject)`. The preview showed that correctly, as a blank, and unhelpfully.
`HandlebarsPreviewResult.dropped` now names the placeholders responsible, filled
only in that branch, so a host can say which value is missing.

## Where the gutter and a host's list can disagree

The gutter builds its issues from the editor's live document; a host builds its
own from the stored draft. Those are not the same content — the editor re-joins
a block split across formatting runs, and turns `{{}}` into an empty chip — so
an issue can exist in one list and not the other. It used to be claimed by the
canvas on the strength of its channel and field, and drawn by nobody.

So the canvas reports what it actually drew, in `placedCanvasIssuesAtom`, and
`useIssuesNotPlacedOnCanvas` subtracts exactly that from a host's list. A host
mounting the gutter should use the hook; `issuesWithoutCanvasHome` remains for
one that does not. If you add a surface that draws issues, report what it drew
the same way rather than teaching the static filter about it.

## Measuring the gutter against the right box

Two bugs in the summary pill, both from measuring against something that is not
the thing you are positioning inside. The gutter overlay is absolutely positioned
against a wrapper whose `offsetParent`, in Studio, sits ABOVE the phone bezel —
and the bezel between them is positioned, so an `offsetTop` chain mixes two
origins. Worse, walking UP from the overlay to find the scrolling box leaves the
frame entirely and finds Studio's page pane, which put the pill at `top: -48px`,
at the top of the window.

The scroller is now found from the EDITOR, and the pill sits at the first
block's rest position: `firstBlockRect.top + scroller.scrollTop − wrapperRect.top`.
Reading the scroller's own padding instead is not enough — on SMS the 48px is a
margin and a padding on `.courier-sms-editor`, between the scroller and the
editor. A block's own rect is exact whatever markup sits in between, and adding
`scrollTop` back is what makes it independent of scroll.

jsdom gives every element a zero rect, so these are tested by stubbing
`getBoundingClientRect` on a tree built to Studio's real nesting and its measured
numbers. Any test here that does not stub rects is asserting nothing.

## Verification

- Unit: 4543 passed / 0 failed, the suite also run under `TZ=America/Sao_Paulo` to
  keep the date helpers honest about zones. `roundTrip.test.ts` drives the real conversion pipeline
  both ways over 11 shapes (Float subject, nested blocks, braces-in-argument,
  triple-stache, unknown helper) asserting byte equality. `handlebarsEscape.test.ts` types
  character-by-character through `handleTextInput` the way ProseMirror does — typing a
  whole string in one insert bypasses input rules, which is why browser-automation "type"
  is not a valid proxy here. `sendParity.test.ts` and the matrix fixture assert measured
  send output rather than the preview's own behaviour.
- Live, dev `geraldo`/`template1`: wrote the Float subject and a body with
  `{{#if}}`/`{{else}}`/`{{truncate}}` via the API, opened the editor, let it autosave, and
  re-read with `version: "latest"` — byte-identical, version unchanged. Preview toggled
  both branches.
- Live, Studio: the branch has been vendored into Studio and driven in the browser at
  every step, through three audit rounds. Confirmed there: every audited expression
  matches its send; the email, in-app and push titles agree; Publish & Test no
  longer reports a send failure that would not happen; the audit template that sends
  cleanly carries no warning or invalid chips while the one full of send-killers blocks on
  all 43 with one issue each; the gutter places its pills level with their blocks through a
  55-block template; a block opener typed at human speed becomes an expression chip
  with its suggestion list, on the canvas and in the subject alike; the In-app label is
  one control whichever side it is edited from; and `{{var "name"}}` draws amber while
  `{{var "tenant.name"}}` is clean, with the dropped-subject notice naming the
  placeholder that emptied it.
- Harness: `/handlebars` page in `editor-dev` with preview and branch toggles.

## Not done

- No UI surface lists a field's validation warnings; they are on the chip's `title` only.
- `format`, `translate`/`t`, link-tracking and partial helpers are pass-throughs in
  preview and reported via `approximated`; nothing consumes that signal yet.
- Partials (`{{> partial}}`, `{{#> layout}}`) are untouched on purpose — the feature is
  not released, so there is nothing to be faithful to yet.
- The `variables` prop doubles as preview data. A dedicated test-data payload was the
  ticket's second OPEN question and is still open.
- `renderTitlePreview` is exported for Studio's subject bar; the Studio-side switch to it
  is uncommitted in the frontend repo, as is the gutter's mount.
- `Tooltip` still cannot be positioned by its caller; see the note above.
- The gutter shows template issues only — the variable warnings a chip raises through the
  host's validator live behind the chip's own atoms rather than in `collectTemplateIssues`,
  so gutter and chips agree on the template and diverge on host-rejected names. It is
  mounted on all six channels; SMS and Push draw one summary pill for the box.
- `VariableChipBase`'s focus race is unfixed; see above.
- Escape in an open chip still leaves what was last committed rather than restoring the
  pre-edit text. Raised with the user on 2026-09-29, who chose to keep it as it is.
- Opening a template can re-save it in a way that breaks the send — the conversion
  round-trip splits `{{{{raw}}}}` and drops an escape. Found by the 2026-09-29 audit,
  ticketed as C-21142 and deliberately out of this PR.
- The SMS and Push previews go blank when a rendered value carries bold markdown
  (C-21259), and the SMS href drops a single-brace variable (backend, ticketed).
- Escaped `\{{…}}` still blocks, by the user's ruling, though the send delivers it, and so
  does `{{#items}}`, on the same ruling.
- The In-app canvas draws ONE body block however many text elements the template has, so
  issues in the others are pinned to the nearest block above. Its own ticket, C-21311.
- `format` is flagged for a multi-placeholder literal pattern only when its one value is a
  scalar LITERAL. A path could hold an array at send, which fills one placeholder per
  item, so those are left alone — a deliberate gap on the side of silence.
