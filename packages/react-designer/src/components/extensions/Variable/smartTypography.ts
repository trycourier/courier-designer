import { Extension, InputRule } from "@tiptap/core";
import { isInsideOpenExpression } from "./openExpression";

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
