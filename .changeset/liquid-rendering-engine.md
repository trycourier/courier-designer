---
"@trycourier/react-designer": minor
---

Add Liquid rendering engine support. `TemplateEditor` accepts a controlled `renderEngine` prop that persists to the content's `render_options.engine`. Under Liquid, `{{ }}` variables validate with filters, bracket indexing, and the `data.` namespace, autocomplete inserts `data.*`, and saved tokens use `{{ data.name }}` spacing. Liquid `{% %}` control-flow tags render as distinct chips (no validation; round-trip verbatim). Pressing Enter on a selected variable/tag chip now enters edit mode. Handlebars remains the default and is unchanged.
