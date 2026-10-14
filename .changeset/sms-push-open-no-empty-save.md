---
"@trycourier/react-designer": patch
---

Opening an SMS or Push template no longer auto-saves an empty body. The editor mounted with an empty placeholder while the template loaded, and its setup update queued that empty content as an auto-save, which replaced the draft's SMS or Push text once loading finished. SMS and Push now ignore editor updates until the template has loaded, as Email already did. [C-21461]
