---
"@trycourier/react-designer": patch
---

Let the email style number fields be emptied while typing. Font size, line spacing (document
and block level) and frame padding were controlled straight from the stored value, so clearing
one re-derived the same number and pushed it back into the box — backspacing 13 left a 1 that
refused to delete, and typing 23 over it was impossible. The new `NumberInput` keeps the typed
text while the field is focused, commits every keystroke so the canvas still updates live, and
restores a real value on blur.
