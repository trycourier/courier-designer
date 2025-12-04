---
"@trycourier/react-designer": patch
---

Fix email text and header properties not being preserved: remove unsupported borderRadius and textColor properties from text/heading/image blocks, migrate border format from nested object to flat properties (border_color, border_size, border_width) with backward compatibility for legacy templates, add blank image placeholder detection utility, and fix auto-save triggering after drag-and-drop operations
