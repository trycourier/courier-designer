---
"@trycourier/react-designer": patch
---

fix: stabilize EditorProvider in SMS/Push/Inbox to prevent content loss

Fixes content persistence issues when switching tabs or pasting rich text in SMS, Push, and Inbox channels. EditorProvider was being recreated on every content change because the content prop was derived from dynamic state. Changed content derivation to only depend on isTemplateLoading state, making it stable after initial mount.
