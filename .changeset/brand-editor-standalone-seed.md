---
"@trycourier/react-designer": patch
---

Standalone `<BrandProvider><BrandEditor/>` no longer overwrites a brand with defaults. The editor filled its form before the brand loaded and never refilled it, and the footer editor's own setup update replaced the loaded footer with an empty one, so the first edit auto-saved default colors, an empty header and logo, empty social links and a blank footer over the brand's draft. The form and footer are now filled from the loaded brand, and auto-save starts only after that. Until then the canvas and sidebar show a loader instead of inputs, so nothing can be edited mid-load; a failed load says so instead of spinning, and no longer refetches in a loop. The brand query no longer requests a template when there is none (which errored), and `BrandProvider` now shows load and save errors as toasts. [C-21459]
