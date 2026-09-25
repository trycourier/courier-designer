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

export function isParseableJs(expression: string): boolean {
  if (!expression.trim()) return true;
  if (!jsExpressionSupported()) return true;

  try {
    new Function(`return (${expression});`);
    return true;
  } catch {
    return false;
  }
}
