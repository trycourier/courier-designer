---
"@trycourier/react-designer": minor
---

Add first-class Handlebars support across the designer.

Handlebars is now something the editor understands rather than text it mangles.
Previously, typing `{{` opened an empty variable chip: right for `{{data.name}}`, wrong
for everything else, because the characters that followed a `{{#if}}` or a helper call
landed beside the chip, the empty chip was dropped on blur, and the author was left with
`#if x}}` — saved. A template authored through the API fared no better: every expression
that was not a plain variable came back flagged as a malformed variable.

**Authoring.** Any expression that is not a variable reference now lives on its own
node that re-emits the occurrence byte for byte, so a template written through the API
round-trips unchanged and one written in the editor survives a save. Typing `{{`
offers variables and helpers, each with its parameters; picking a block helper inserts
a balanced pair. Expressions are editable in place, with a signature hint marking the
argument under the caret.

**Validation.** Helper names, their signatures and the operator vocabularies of
`condition` and `filter` are mirrored from the renderer, so the editor flags what would
genuinely fail at send — a syntax error the compiler would reject, an unknown helper
wherever it is called, a block helper written as a plain mustache, a call short of the
arguments it needs or carrying more than the helper reads, a literal the renderer
refuses, unbalanced blocks, an expression that cannot resolve under the workspace's
variable scope — and stays quiet about the rest, including everything that depends on
the data rather than the template. Variables
used inside a helper are validated, listed and offered a value exactly as standalone
ones are, including the quoted path of a `{{var "tenant.name"}}`, which the renderer
resolves like a legacy single-brace variable, and references an enclosing block supplies (`@index`, `this.qty`, `$.item.*`)
are never put to a host's validator, which cannot know them. A bare name is the block's
own only inside `{{#each}}` or `{{#with}}`, which rebase the context — inside `{{#if}}` it
still reads at the root, so the host judges it — and a block left unclosed in one element
no longer puts the elements after it in scope. An issue is drawn in the canvas
gutter beside the block it is about, on every channel, red where the send fails and amber
where it only renders wrong, with every issue for that block on hover. The pills measure from the visible frame rather than the
editor element — a host can nominate one with `data-issue-gutter-edge` — sit on the
block's first line, and are counted at the edge when a scrolling canvas has clipped the
block they belong to. SMS and Push, whose canvas is a single
text box, get one pill for the whole box rather than one per block: it carries the counts,
stays put as the box scrolls, and its tooltip names the line each issue is on and takes
you there. An In-app button's label and link are
reported and drawn on the row the canvas shows, both buttons of a pair on the one row it
merges them into. A button's label is the same control wherever it is edited: a label
typed in the In-app sidebar reaches the canvas, one typed on the canvas reaches the
sidebar, and the expressions and variables in it draw as the same chips, with the same
verdicts, on both. Nothing is
left
unshown: where a canvas draws no block for an element — the In-app canvas keeps one body
paragraph, and only Push and In-app draw the title — the issue is pinned to the nearest
block above it. `useTemplateIssues()` exposes
every issue in the document, across channels and locales — including the names a
host's own validator turns down, so one list feeds both the canvas pills and a host's
count and the two cannot disagree — with a severity that follows
the renderer: gate a send or a publish on `severity === "blocking"`. It fails open, so a
fault can only ever leave a button enabled. `issuesWithoutCanvasHome()` returns the ones
the canvas cannot place — another channel, a locale, a `raw` field, the subject — so a
host's own list can show those and not repeat what the gutter already says.

**Preview.** The new `variableViewMode` prop renders each field through Handlebars
against the test event's data, so both branches of a conditional can be checked without
sending. It implies `readOnly` — rendered output is never written back over a template. Where the
send would drop a subject or title outright, because a placeholder in it has no value,
the preview shows that emptiness and names the placeholders responsible rather than
leaving a silent blank.
The preview is built to match the send rather than to look plausible: it runs the
renderer's own helper behaviour, resolves paths under the same variable scope, keeps the
send's distinction between a body rendered once and a title rendered twice, and fails
where a send would fail instead of quietly rendering something the reader will never
see. Helpers that depend on send-time context — translation catalogues, link tracking,
partials — are marked as approximate rather than guessed at.

**For hosts embedding the editor**, the pieces behind all of this are exported: the
segmentation and classification layer (`segmentText`, `classifyExpression`,
`scanHandlebars`, the variable rules, `variableReferencesIn`), renderers for fields
outside the editor (`renderElementalPreview`, `renderHandlebarsPreview`,
`renderTitlePreview`, `renderVariablesInHtmlString`, `renderVariablesInTextString`,
`useHandlebarsPreviewData`), and `chip-styles.css` — the chip rules alone, with no
Tailwind preflight, for injecting into a preview `iframe` where the full stylesheet
would restyle the customer's email.

Also fixes the CJS bundle throwing on import, and adds opt-in tracing for the preview
path behind `window.__COURIER_DEBUG_HANDLEBARS_PREVIEW__` or
`localStorage["courier:debug-handlebars-preview"]`.

One editing constraint worth knowing: a text block whose block helper spans several
formatting runs is saved as a single markdown string, because the renderer compiles each
part on its own and the split shape fails the send. Bold, italic, strike, underline and
links survive that as markdown; colour and size marks inside such a block do not.
