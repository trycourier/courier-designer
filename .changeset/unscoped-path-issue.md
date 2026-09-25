---
"@trycourier/react-designer": patch
---

Add an `unscoped-path` template issue. Under `scope: "strict"` — what Studio writes — the send's variable handler is rooted above `data`, so a bare path in `(path "…")`, `(get-list-items "…")` or `(filter "data" "…" …)` is undefined on every send whatever the payload. The editor now says so at edit time instead of leaving it to the preview and the data.

It is blocking where the renderer throws on that `undefined` — `CONTAINS` / `NOT_CONTAINS` raise "Left operand cannot be undefined or null" and a math helper raises "undefined is NaN" — and a warning everywhere else, where the send still delivers. It does not fire inside `{{#each}}` / `{{#with}}`, where a bare path resolves against the block's context, nor for `filter "profile"` or `var` / `inline-var`.

`severityOfIssue` is exported alongside `severityForCode` for hosts that gate on severity: one code now covers both a send that dies and one that only renders wrong.
