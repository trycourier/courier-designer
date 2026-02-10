---
"@trycourier/react-designer": patch
---

Fix undo requiring two Ctrl+Z presses and improve undo granularity

- Exclude visual-only selection state (isSelected attribute) updates from undo history by setting addToHistory: false on the updateSelectionState transaction
- Reduce history newGroupDelay from 500ms to 100ms for more granular undo steps, matching the behavior of standard text editors
