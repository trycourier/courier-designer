import { Extension, InputRule } from "@tiptap/core";
import type { EditorState } from "prosemirror-state";

/**
 * Typography's smart quotes and ellipsis, minus the cases that corrupt a
 * handlebars expression.
 *
 * The renderer needs straight quotes: `{{truncate x 20 "..."}}` typed in the
 * editor became `{{truncate x 20 “…”}}`, which drops the suffix at send with no
 * error and no way for the author to see why. Turning Typography off wholesale
 * would cost smart quotes in ordinary body copy, so these rules are re-added
 * with a guard instead.
 *
 * They cannot live in `handlebarsEscapePlugin`: TipTap gathers every
 * extension's `addInputRules()` into one plugin that runs ahead of extension
 * plugins, so a `handleTextInput` guard never sees the keystroke. The guard has
 * to be inside the rule itself.
 */

/** Whether the caret sits inside an unclosed `{{` in the current text block. */
function isInsideOpenExpression(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos);
  const parent = $pos.parent;
  if (!parent.isTextblock) return false;

  // A still-empty variable chip is an expression the author has just opened —
  // the `{{` rule already swallowed the literal braces — so it counts.
  let before = "";
  const parentStart = $pos.start();
  parent.forEach((child, offset) => {
    if (parentStart + offset >= pos) return;
    if (child.isText) before += child.text ?? "";
    else if (child.type.name === "variable") before += child.attrs.id ? "{{}}" : "{{";
    else if (child.type.name === "handlebarsExpression") before += "{{}}";
  });

  const open = before.lastIndexOf("{{");
  if (open === -1) return false;
  return before.indexOf("}}", open) === -1;
}

/**
 * A replacement rule that leaves the typed text alone inside an expression.
 * Doing nothing in the handler is what keeps the literal character.
 */
function guardedRule(find: RegExp, replace: string): InputRule {
  return new InputRule({
    find,
    handler: ({ state, range, match }) => {
      if (isInsideOpenExpression(state, range.from)) return;

      // Preserve any leading character the pattern needed for context.
      const lead = match[0].slice(0, match[0].length - (match[1]?.length ?? match[0].length));
      state.tr.insertText(lead + replace, range.from, range.to);
    },
  });
}

export const HandlebarsSafeTypography = Extension.create({
  name: "handlebarsSafeTypography",

  addInputRules() {
    return [
      // Mirrors @tiptap/extension-typography's patterns for the five rules that
      // can appear inside an expression.
      guardedRule(/(?:^|[\s{[(<'"‘“])(")$/, "“"),
      guardedRule(/"$/, "”"),
      guardedRule(/(?:^|[\s{[(<'"‘“])(')$/, "‘"),
      guardedRule(/'$/, "’"),
      guardedRule(/\.\.\.$/, "…"),
    ];
  },
});
