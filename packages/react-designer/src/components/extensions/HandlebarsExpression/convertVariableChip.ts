import { classifyExpression } from "@/lib/utils/handlebars/classifyExpression";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "prosemirror-state";

/**
 * Sigils that make a variable chip the wrong node the moment they are typed.
 *
 * `#`, `/` and `^` open a block, close one, or open an inverse section — none
 * of which is a variable path, and all of which the expression chip knows how to
 * complete. The same set `handlebarsEscape` uses at document level, so a chip
 * converts on whichever side of the focus race the keystroke lands.
 */
const BLOCK_SIGILS = new Set(["#", "/", "^"]);

/** Whether this chip text is a block expression rather than a variable name. */
export function startsBlockExpression(text: string): boolean {
  return BLOCK_SIGILS.has(text.trimStart()[0] ?? "");
}

export interface ConvertVariableChipOptions {
  editor: Editor;
  /** Position of the variable node, from the node view's `getPos`. */
  getPos: (() => number | undefined) | boolean | undefined;
  /** Size of the variable node being replaced. */
  nodeSize: number;
  /** The expression body, without braces. */
  text: string;
  /**
   * True while the author is still typing it: the new chip opens in edit mode
   * with the caret at the end, so the keystrokes that follow carry on into it.
   * False on a commit, where the caret belongs after the finished chip.
   */
  autoEdit: boolean;
}

/**
 * Swap a variable chip for the expression chip its text actually is.
 *
 * Typing `{{` opens a variable chip that takes focus a frame later, so whether
 * `#if x` reaches the document or the chip is a race the author cannot see —
 * and the two used to end differently. This is the chip's half of that; the
 * plugin in `handlebarsEscape` is the document's.
 *
 * Returns false when the swap could not be made — no expression node in the
 * schema, or the node has already gone — and the caller should carry on with a
 * plain attribute update.
 */
export function convertVariableChipToExpression({
  editor,
  getPos,
  nodeSize,
  text,
  autoEdit,
}: ConvertVariableChipOptions): boolean {
  const expressionType = editor.schema?.nodes.handlebarsExpression;
  if (!text || !expressionType || typeof getPos !== "function") return false;

  try {
    const pos = getPos();
    if (typeof pos !== "number") return false;

    const expr = classifyExpression(text);
    editor
      .chain()
      .command(({ tr }) => {
        const created = expressionType.create({
          raw: `{{${text}}}`,
          kind: expr.kind,
          name: expr.name,
          isInvalid: false,
          ...(autoEdit ? { autoEdit: true } : {}),
        });
        tr.replaceWith(pos, pos + nodeSize, created);
        // Put the caret after the new chip. Without this the author is left
        // with focus on a contenteditable that no longer exists, and everything
        // they type next goes nowhere until they click. An `autoEdit` chip
        // moves it again itself, into its own span.
        tr.setSelection(TextSelection.create(tr.doc, pos + created.nodeSize));
        return true;
      })
      .focus()
      .run();
    return true;
  } catch {
    /* node is gone */
    return false;
  }
}
