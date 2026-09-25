import { isValidVariableName } from "@/components/utils/validateVariableName";
import type { HandlebarsExpression } from "./classifyExpression";
import { classifyExpression } from "./classifyExpression";
import { scanHandlebars } from "./scanHandlebars";
import { isBlockScopedReference, isLoopReference, variableArguments } from "./variableRules";

/**
 * Every payload path a run of text refers to, whether it stands alone or sits
 * inside a helper call.
 *
 * `{{data.user.name}}` and `{{capitalize data.user.name}}` both refer to the
 * same field, so both have to contribute it — otherwise the path is missing
 * from Preview & Test's manual inputs, and the author cannot fill in a value
 * for something their template plainly uses. A `{{...}}`-shaped regex cannot do
 * this: the whole inner text fails a variable-name check as soon as it contains
 * a space, so every multi-token expression contributed nothing.
 */

/** Blocks that rebase the context names resolve against. */
const REBASING_BLOCKS = new Set(["each", "with"]);

/** Expressions whose arguments can hold variable references. */
const KINDS_WITH_ARGS = new Set(["helperCall", "blockOpen", "blockInverseOpen", "blockElse"]);

/**
 * A resolvable reference: a real path the host could supply a value for.
 * Loop refs (`$.item`) and block-scoped ones (`this.x`, `@index`) are supplied
 * by the enclosing block at send time, so they are never manual inputs.
 */
function isResolvablePath(name: string): boolean {
  if (!name) return false;
  if (isBlockScopedReference(name) || isLoopReference(name)) return false;
  return isValidVariableName(name);
}

/**
 * The path a `filter` call reads, which it takes as a quoted string.
 *
 * Verified against the backend (`handlebars/helpers/universal/filter.ts`): a
 * source of `profile` resolves the property inside the profile scope, anything
 * else resolves it at the root, so the property is the path as written. The
 * quotes meant the literal skip dropped it, and a template built out of
 * `(filter …)` reported no variables at all.
 */
function filterPath(args: string[]): string | undefined {
  const unquote = (token = "") => token.trim().replace(/^["']|["']$/g, "");
  const source = unquote(args[0]);
  const property = unquote(args[1]);
  if (!property) return undefined;
  return source === "profile" ? `profile.${property}` : property;
}

function collect(expr: HandlebarsExpression, out: Set<string>): void {
  if (expr.kind === "variable") {
    if (isResolvablePath(expr.name)) out.add(expr.name);
    return;
  }

  if (!KINDS_WITH_ARGS.has(expr.kind)) return;

  // A helper argument must be a namespaced path (`data.x`, `profile.y`). A bare
  // token there is almost never a field: `{{ not a variable }}` would otherwise
  // contribute `a` and `variable` as manual inputs. A standalone `{{amount}}`
  // still counts, which is why the rule is only applied to arguments.
  for (const arg of variableArguments(expr.args)) {
    if (arg.includes(".") && isResolvablePath(arg)) out.add(arg);
  }

  if (expr.name === "filter") {
    const path = filterPath(expr.args);
    if (path && path.includes(".") && isResolvablePath(path)) out.add(path);
  }

  // `{{#if (and (condition data.score ">=" 80) data.flag)}}` — a sub-expression
  // is itself a helper call, so its operands count too.
  for (const arg of expr.args) {
    if (arg.startsWith("(")) {
      collect(classifyExpression(arg.replace(/^\(/, "").replace(/\)$/, "")), out);
    }
  }
}

export interface VariableReferenceOptions {
  /**
   * Include triple-stache references (`{{{data.html}}}`). HTML blocks exclude
   * them: they render unescaped markup the editor cannot reproduce.
   */
  includeTriple?: boolean;
}

export function variableReferencesIn(
  text: string,
  { includeTriple = true }: VariableReferenceOptions = {}
): string[] {
  if (!text) return [];

  const out = new Set<string>();
  // Inside `{{#each}}`/`{{#with}}` a name resolves against the block's context
  // rather than the payload — `{{#with data.address}}{{city}}` reads
  // `data.address.city` — so there is nothing there to ask the sender for. The
  // block's own source is a real path and still counts. `{{#if}}` does not
  // rebase the context, so names inside one are still the sender's to fill in.
  const open: boolean[] = [];
  const inRebasedContext = () => open.some(Boolean);

  for (const span of scanHandlebars(text)) {
    if (span.triple && !includeTriple) continue;

    const expr = classifyExpression(span.inner, span.triple);
    if (!inRebasedContext()) collect(expr, out);

    if (expr.kind === "blockOpen" || expr.kind === "blockInverseOpen") {
      open.push(REBASING_BLOCKS.has(expr.name));
    } else if (expr.kind === "blockClose") {
      open.pop();
    }
  }
  return Array.from(out);
}
