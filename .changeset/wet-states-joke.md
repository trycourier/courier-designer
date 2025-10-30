---
"@trycourier/react-designer": patch
---

Fix auto-save race condition where pending changes were dropped during rapid typing. Added debouncing for subject field updates and content deduplication to prevent unnecessary saves. Includes comprehensive test coverage for race condition handling.
