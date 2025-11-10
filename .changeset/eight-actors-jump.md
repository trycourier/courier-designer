---
"@trycourier/react-designer": patch
---

Fix race condition bug causing data loss during auto-save when typing with short pauses in Email Subject field. Implemented flush mechanism to ensure all pending debounced updates complete before auto-save executes.
