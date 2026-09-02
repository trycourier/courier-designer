---
"@trycourier/react-designer": patch
---

Default the email background colour to `#F5F5F5`, matching the backend renderer.

The editor's default was `#FAF8F6` while the `line` email template renders `{{default @pageBackgroundColor "#f5f5f5"}}`. Because a missing `background_color` is back-filled onto the email channel node when a template is opened, that mismatch quietly repainted templates with a colour the renderer would never have produced on its own. Templates that were already back-filled keep the colour they were given; only ones that still have no `background_color` pick up the corrected default.
