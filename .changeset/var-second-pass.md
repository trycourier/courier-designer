---
"@trycourier/react-designer": patch
---

Model the send's second substitution pass properly, instead of treating it as a data fallback inside `var`.

An unresolved `{{var "name"}}` renders the literal `{name}`; a second, data-scoped pass over the rendered text is what may then fill it in. Measured on dev, that pass reaches a block's `content` string and a meta title but NOT the `string` parts the designer saves text as — so in designer text a bare `var` reaches the reader as `{name}` while the preview showed the value. The preview now matches, and `unscoped-path` reports it as a warning there (not in a subject or a meta title, where the pass does run).

Modelling it as a resolver fallback also got sub-expressions wrong: the first pass hands `(var "quantity")`'s placeholder straight to `add`, which dies with "{quantity} is NaN" in both surfaces. That is now reported as blocking.
