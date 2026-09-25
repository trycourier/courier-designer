---
"@trycourier/react-designer": minor
---

Add first-class Handlebars support across the designer.

Typing `{{` used to delete the literal braces and open an empty variable chip. For a
variable that is right, but for anything else — `{{#if}}`, `{{else}}`, `{{/if}}`, a
helper call — the following characters landed after the chip, the empty chip was
dropped on blur, and the author was left with `#if x}}`. A conditional written in the
editor could not survive a save, and one written through the API came back as a
malformed variable.

Expressions that are not variable references now live on their own node, which
re-emits the occurrence byte-for-byte, so a template authored through the API
round-trips unchanged. Helper discovery, signature hints and validation come from a
registry mirrored from the renderer, so the editor flags what would actually fail at
send and nothing else — including block balance, unknown helpers, and the separate
operator vocabularies of `condition` and `filter`.

Adds a `variableViewMode` prop. `wysiwyg` renders each field through Handlebars
against the available data so both branches of a conditional can be checked without
sending, and implies `readOnly` so rendered output is never written back over the
template. Preview renders against the test event's real types where one is supplied,
falls back to the values typed into Preview & Test, and treats an unfilled path as
absent rather than empty so `{{default x "y"}}` falls back exactly as it will at send.

Variables used inside a helper are treated as variables everywhere: they are
validated, listed in Preview & Test and offered for a value, hash arguments
(`key=data.v`) included. Validation delegates to the host's validator rather than a
list lookup, since `data.*` is the send payload and unknowable beforehand, and
references supplied by an enclosing block (`@index`, `this.qty`, `$.item.*`) are never
put to it.

New public API for hosts embedding the editor:

- `useTemplateIssues()` — every Handlebars issue in the document, across all channels,
  with a severity that tracks the renderer rather than the editor. Gate a send or a
  publish on `severity === "blocking"`; it fails open, so a fault can only ever leave
  a button enabled.
- The segmentation layer — `segmentText`, `classifyExpression`, `scanHandlebars`, the
  variable rules and `variableReferencesIn` — so a surface that cannot mount React
  chips the same way the design view does instead of guessing with a regex.
- `renderElementalPreview`, `renderHandlebarsPreview` and
  `renderVariablesInHtmlString` for rendering outside the editor, the last of which
  emits chip markup and never substitutes inside an HTML tag.
- `chip-styles.css` — the chip rules alone, with no Tailwind preflight, for injecting
  into a preview `iframe` where the full stylesheet would restyle the customer's
  email. The chip label's truncation, ellipsis and `white-space` moved out of the
  React component's inline styles and into that sheet, so both renderers share one
  definition.

Also fixes the CJS bundle throwing on import, and adds opt-in tracing for the preview
path behind `window.__COURIER_DEBUG_HANDLEBARS_PREVIEW__` or
`localStorage["courier:debug-handlebars-preview"]`.

Preview ↔ send parity fixes:

- A text block whose block helper spans formatting runs is saved as one markdown
  `content` string, since the backend compiles every `elements` part on its own and
  the split shape failed the send with a parse error. Bold, italic, strike, underline
  and links survive as markdown; colour and size marks inside that block do not.
  `collectTemplateIssues` reports an already-saved split run as the blocking
  `split-block` issue.
- Preview data drops null-valued object keys the way the send does, so a math
  helper on a `null` field fails in preview as it fails at send, and `trim` renders
  `""`. `inc` no longer asserts, matching the send's `NaN`.
- `split` asserts that its value and delimiter are strings, as the send does, so a
  missing, numeric or array value fails in preview instead of splitting `"undefined"`.
- `json-parse` and `parse-string` throw where the send throws (a non-string value,
  invalid JSON, a trailing backslash) instead of swallowing the error, and
  `parse-string` is no longer reported as approximated.
- `var`, `inline-var`, `path` and `get-list-items` take a path string and resolve it
  the way the send's variable handler does: through the enclosing `each`/`with`
  scope, then the root, where `data`'s keys are also readable bare. A missing path
  renders `{data.v}` for `var`, an unparseable one `[Error]`, and a lone object is
  wrapped for `get-list-items`.
- `set` takes `(name, value)` by position, rejects the renderer's reserved names
  (`data`, `profile`, …) and a non-string name, and unsets on `undefined`, as the
  send does.
- `courier-block` with an empty or missing block id fails in preview, as it does at
  send.
- `format` is `sprintf` (via `sprintf-js`, as the renderer uses), with an array
  spread into the arguments, instead of echoing the pattern.
- The preview registers `datetime-format`, `swu_datetimeformat`,
  `swu_iso8601_to_time`, `swu_timestamp_to_time` and `trim-one-char-right`, mirrored
  from the renderer on its pinned `date-fns@2.14.0` / `date-fns-tz@1.0.10` (bundled,
  since neither loads as ESM in Node), formatting in UTC as the send's runtime does.
  `range` accepts one or two arguments.
- Helpers no longer read Handlebars' options hash as a missing argument, so
  `{{default x}}` renders empty and `condition` compares `undefined`, as at send;
  `trim`, `trim-left` and `trim-right` work as blocks; `line-break` is a line break
  rather than a literal `<br/>`; `get-link-tracking` returns `{ href }`; `filter`
  mirrors the renderer's operators and path resolution. A helper inside a
  sub-expression is now reported as approximated too.
- Exports `useHandlebarsPreviewData`, so a host field rendered outside the editor
  (Studio's email subject bar) previews against the same data as the body.
- The editor stops flagging three valid expressions: a bare name the renderer
  registers as a helper (`{{line-break}}`) is a helper call, as Handlebars treats
  it; a literal hash value (`disableLinkTracking=true`) is not a variable; and a
  name defined by an earlier `{{set "name" …}}` is accepted.

Fixes from the handlebars consistency audit that followed:

- The translation editor loads helpers and block helpers as expression chips, so opening a template's Localize page no longer rewrites it or flags every helper as invalid.
- Preview keeps an empty string from the test event, as the send does; blanks the author never filled in and `null` are still dropped.
- Preview and accept the handlebars-intl helpers the send registers (`formatNumber`, `formatDate`, `formatTime`, `formatRelative`, `formatMessage`, `formatHTMLMessage`, `intl`, `intlGet` and their deprecated aliases), and read `{{~#if~}}` whitespace control as the helper it wraps.
- Report broken handlebars inside locale overrides (content, title, href, raw and inline runs) as template issues, tagged with the locale, since the send for that locale fails.
- `text-direction` previews `text-rtl` for right-to-left text and an empty string otherwise, like the send, instead of always `ltr`.
- Preview legacy single-brace `{data.x}` variables where the send still substitutes them (text and action content, the subject), via the new `convertSingleBraceVariables` export for hosts rendering header fields.
- A locale's `raw` replaces the base one whole in preview, as the send does, and `applyLocaleToContent` is exported for hosts previewing HTML-mode locales.
- Typing `{{#` opens an expression chip in edit mode, and suggestions match the token under the caret, so a variable path can be picked while a block condition is being typed.
- An image whose source is a handlebars expression is stored as typed and keeps its place on the canvas, showing the source, instead of collapsing to an invisible, unselectable block.
- `}}` closes an open expression chip, spacing left by a helper pick is collapsed on commit (quoted strings untouched), and a chip whose selection has moved away commits instead of leaving its signature hint on screen.
- The subject and label inputs offer helpers as well as variables, matching the canvas.
- Autocomplete offers only the helpers documented at courier.com/docs/design/templates/variables, each listed once. Every other helper stays valid and unflagged — it is simply not suggested.
- A chip opened by picking a helper no longer reopens itself after it commits, so the next keystroke goes where the author put the caret. Picking a suggestion also closes the list, `{{name` typed or pasted in one burst carries the name into the chip, and `text-direction` shows the argument it takes.
- Characters typed in the moments after `{{` opens a chip land in the chip rather than beside it, `{{` typed inside an open chip drops the braces, the signature hint no longer covers the chip being edited, and an image with a typed source opens the sidebar on From URL at full width.
- A chip that has been folded away no longer writes over what replaced it, so a quoted helper argument survives being typed. An image with no stored width loads and saves as full width rather than 1%, the signature hint never covers the chip being edited, and committing a chip no longer pulls the caret back from wherever the author just clicked.
- A chip closed with `}}` keeps what was typed even if the author clicks away immediately, the signature hint measures its room inside the editor pane rather than the window, and an unresolvable image's placeholder takes the block's width and alignment.
- A content sync that lands while a chip is being edited no longer replaces the document under the author, which lost the chip and the keys typed after it.
- Cmd+A inside a chip selects the chip's own text rather than the whole email, closing a chip with `}}` keeps the caret after it, clicking past a trailing chip in the Label field no longer replaces it, `$.item`/`$.index` inside a loop and `{{~x~}}`/`{{data.items.[0].name}}` are accepted, and preview decodes HTML entities the way the send does while the stored template is left byte for byte as it was.
- Characters typed immediately after `{{` stay in the chip even on a large template, `range` with a step of 0 is blocked rather than previewing empty and crashing the send, a channel's `raw.subject` is shown and treated as the literal text the send delivers, and an `if` or `loop` that is not valid JavaScript blocks instead of failing every send silently.
- SMS, push and inbox rebuild their preview when the preview data changes, as email, MSTeams and Slack already did.
- A chip keeps taking the keys typed before its span has focus until it actually has focus, `{{~data.x~}}` is accepted by a host whose validator only knows plain paths, and the caret is never left in a chip that has already committed.
- Double-clicking a variable chip opens it filtered to its own name, so Enter straight afterwards keeps the name instead of committing the first row of an unfiltered list.
- Clicking the empty space of a subject or label row places the caret instead of throwing.
- `{{../name}}` inside nested `{{#each}}` blocks is accepted, judged by how many enclosing blocks actually rebased the context, and `{{#script}}`-style raw text — `<script>`, `<style>`, `<title>`, `<textarea>` and comments — keeps its handlebars verbatim in the HTML block preview.
- New `renderVariablesInTextString` export renders the same chips for a plain-text field, such as a CC or Reply-To header, escaping the text around each expression and building the chip from the expression as written.
- Each editor keeps its own variable view mode, so a preview elsewhere in the tab can no longer leave another editor drawing its expressions invisibly, and `filter`'s quoted path counts as a variable the template uses.
- Undo after typing a chip no longer reopens an empty chip or wipes the redo stack, a `{{set}}` is honoured only where the send honours it, and an image's alt text is plain text that no longer blocks publishing.
- Chips are red only when the send will fail and amber when it will render an empty string, a host can word a rejected name once with `describeInvalid` and have the chip say it, and a name inside `{{#each}}`/`{{#with}}` is no longer offered as a manual input.
- `setDefinedNamesInPart`, `isParseableJs` and `stripWhitespaceControl` are exported, so a host can apply the same rules the designer does rather than keeping its own copy.
