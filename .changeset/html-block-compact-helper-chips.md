---
"@trycourier/react-designer": patch
---

Compact helper-call chips inside HTML blocks. A chip such as
`{{datetime-format (swu_iso8601_to_time createdOn) "%m"}}` showed its whole
signature, wrapped to three lines, and inside a customer's
`white-space:nowrap` span widened the table cell past the email's right edge.
In an HTML block a helper call now reads as its name plus its first meaningful
argument (`datetime-format createdOn…`), skipping nested helper names and string
literals, on a single line capped at 160px. The full expression stays in the
chip's title. Block helpers, `else`, closers, variables and the design-view text
blocks are unchanged, and warning/invalid colouring still applies.
