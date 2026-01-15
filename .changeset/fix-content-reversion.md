---
"@trycourier/react-designer": patch
---

fix: prevent template content from reverting after programmatic updates

When setTemplateEditorContent() was called programmatically, content would revert back to the API draft version when templateData updated. Fixed by tracking the last synced templateData object reference and only applying API content when it's a new object. Also added restoration effect to Email editor to update visual content when atom changes.
