---
"@trycourier/react-designer": patch
---

Remove rich text formatting (bold, italic, underline, strikethrough) from button labels: the ProseMirror schema now uses `content: "text*"` with `marks: ""` to disallow marks, formatting keyboard shortcuts are blocked inside button nodes, and legacy formatting attributes/toolbar commands have been removed
