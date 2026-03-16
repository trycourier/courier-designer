---
"@trycourier/react-designer": patch
---

Fix silent data loss when email editor unmounts with pending debounced updates (e.g. clicking "Test and Preview" within 200ms of typing). The destroy handler now flushes pending content updates synchronously instead of discarding them.
