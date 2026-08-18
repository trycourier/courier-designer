---
"@trycourier/react-designer": patch
---

Drop the `p-1` padding from the image block wrapper in the editor canvas. The 4px inset was
editor-only — the email renderer emits no such padding — so images rendered indented relative
to text blocks, which sit flush against the block edge. The wrapper keeps `relative` for the
upload/loading overlay.
