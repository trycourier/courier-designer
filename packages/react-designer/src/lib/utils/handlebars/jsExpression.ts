/**
 * Whether an element's `if` or a list's `loop` is JavaScript that parses.
 *
 * The send runs these for real — `filter-conditionals.ts` runs `vm.run(ifValue)`
 * in a vm2 sandbox and requires a boolean back — so an expression that does not
 * parse fails every send of the template. Nothing in the editor said so, and
 * Publish and Send test stayed enabled.
 *
 * Parsing only: the expression is compiled and thrown away, never called, so
 * nothing in it runs in the author's browser.
 */
let supported: boolean | null = null;

export function jsExpressionSupported(): boolean {
  if (supported !== null) return supported;
  try {
    new Function("return 1");
    supported = true;
  } catch {
    // A host with a strict Content-Security-Policy forbids this. Then the check
    // cannot run at all, and saying nothing beats flagging every expression.
    supported = false;
  }
  return supported;
}

/**
 * Handlebars is rendered BEFORE the expression is run, so what the sandbox sees
 * is the rendered text, not the mustache. `if: "{{data.s.t}}"` reaches it as
 * `true` and is shown at send; parsing the mustache as JavaScript said it was
 * broken. Each expression is stood in for by a literal, which leaves the rest
 * of the syntax to be judged: `{{a}} &&` is still a parse error.
 */
function withoutHandlebars(expression: string): string {
  return expression.replace(/\{\{[\s\S]*?\}\}/g, "0");
}

/**
 * A block spans several mustaches and chooses between the texts BETWEEN them,
 * so what the sandbox finally sees cannot be worked out from the source —
 * `{{#if t}}true{{else}}false{{/if}}` is one token or the other, never both.
 * Nothing static can judge it, and guessing wrong blocks a send that works.
 */
function hasBlockExpression(expression: string): boolean {
  return /\{\{[#/]|\{\{\s*else/.test(expression);
}

export function isParseableJs(expression: string): boolean {
  if (!expression.trim()) return true;
  if (!jsExpressionSupported()) return true;
  if (hasBlockExpression(expression)) return true;

  try {
    // The newlines matter: a trailing `// comment` is legal JavaScript, and
    // wrapping it on one line commented out the closing parenthesis, so
    // `true // x` was reported as a syntax error while the send showed it.
    new Function(`return (\n${withoutHandlebars(expression)}\n);`);
    return true;
  } catch {
    return false;
  }
}
