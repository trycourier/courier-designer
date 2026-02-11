---
"@trycourier/react-designer": patch
---

Rewrite Elemental conversion utilities to use structured elements format: convertTiptapToElemental now outputs an `elements` array with typed sub-elements (type: "string" | "link") and boolean formatting flags (bold, italic, etc.) instead of markdown content strings; convertElementalToTiptap now supports the `elements` array input format with variable and formatting-flag handling; includes alignment mapping between Elemental "full" and TipTap "justify", button padding calculation fixes, and removal of border_color/border_size from list conversion output
