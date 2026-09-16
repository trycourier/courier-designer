---
"@trycourier/react-designer": minor
---

Add first-class Handlebars support across the designer.

Typing `{{` used to delete the literal braces and open an empty variable chip. For a
variable that is right, but for anything else — `{{#if}}`, `{{else}}`, `{{/if}}`, a
helper call — the following characters landed after the chip, the empty chip was
dropped on blur, and the author was left with `#if x}}`. A conditional written in the
editor silently stopped being a conditional, and the damage was saved. Typing a block
sigil or closing a `}}` now restores the braces instead.

Handlebars that is not a plain variable reference is now its own node, shown as a
distinct chip and stored verbatim, so a template authored through the API round-trips
byte-for-byte. Expressions are validated against the helpers the renderer actually
registers — unknown helper, bad `condition` operator and unbalanced braces are
surfaced in the editor, with block-structure problems reported as warnings because a
block may legitimately open in one element and close in another.

Typing `{{` now offers those helpers alongside the variables, under their own heading
and labelled with their parameters; picking one swaps the variable chip for an
expression chip opened ready for arguments. While the arguments are typed, a signature
hint shows the helper's parameter list with the current one picked out, so the author
does not have to know that `truncate` takes `(string, limit, suffix?)`. Parameter
names come from the backend helpers themselves; a helper whose arguments could not be
read from source has no hint rather than a guessed one.

The variable chip is restyled to match the handlebars chip — same height, baseline,
font and metrics — and its icon now sits in the flex flow instead of being absolutely
positioned with a 2px nudge, which had left the icon and label slightly out of line.

`TemplateEditor` gains a `variableViewMode` prop. `show-variables` (the default) is
the editor as before; `wysiwyg` renders each field through Handlebars against
`variables`, so both branches of an `{{#if}}…{{else}}…{{/if}}` can be checked without
sending. Preview implies `readOnly`, so rendered output is never written back over the
template.
