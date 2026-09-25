import type { EditorState } from "prosemirror-state";

/**
 * Whether the caret sits inside an unclosed `{{` in the current text block.
 *
 * A chip that is still taking input counts as an opener whatever it holds: the
 * `{{` input rule swallowed the literal braces, and the characters typed before
 * its edit span takes focus live on the chip itself.
 *
 * One copy on purpose — this existed three times, keyed on an empty chip id,
 * and the copies drifted the moment a chip could hold text.
 */
export function isInsideOpenExpression(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos);
  const parent = $pos.parent;
  if (!parent.isTextblock) return false;

  let before = "";
  const parentStart = $pos.start();
  parent.forEach((child, offset) => {
    if (parentStart + offset >= pos) return;
    if (child.isText) before += child.text ?? "";
    else if (child.type.name === "variable")
      before += child.attrs.id && !child.attrs.autoEdit ? "{{}}" : "{{";
    else if (child.type.name === "handlebarsExpression") before += "{{}}";
  });

  const open = before.lastIndexOf("{{");
  if (open === -1) return false;
  return before.indexOf("}}", open) === -1;
}
