---
"@trycourier/react-designer": patch
---

Stop the preview resolving lazy variable paths against `data` for `path`, `get-list-items` and `filter`. Studio content is `scope: "strict"`, where the send's variable handler is rooted above `data`, so `(path "name")` and `(filter "data" "name" …)` are undefined there and the send fails — while the preview happily rendered a value and flagged nothing. `var` and `inline-var` keep the fallback, because the `{name}` placeholder they leave behind really is filled in by a later data-scoped pass.
