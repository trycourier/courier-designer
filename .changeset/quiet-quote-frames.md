---
"@trycourier/react-designer": patch
---

Stop serializing the quote frame fields `border_left_width`, `padding_horizontal` and
`padding_vertical`. No render path reads them — the email renderer reads `border_size` and
`padding` — and the designer exposes no control for any of them, so they were written on
every quote purely from the Blockquote attr defaults. `convertElementalToTiptap` still reads
them (numbers or strings) so quotes stored before this change keep their frame in the editor,
and they are dropped on the next save. `elemental.types.ts` / `elemental.schema.ts` keep the
fields marked deprecated and read-only.
