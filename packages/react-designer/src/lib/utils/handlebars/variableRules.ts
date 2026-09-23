import { classifyExpression } from "./classifyExpression";
import { isValidVariableName } from "@/components/utils/validateVariableName";

/**
 * The one place that decides whether a variable reference is acceptable.
 *
 * Both a standalone variable chip and a variable used as a helper argument go
 * through here, so `{{data.name}}` and `{{truncate data.name 10}}` are judged by
 * the same rules instead of drifting apart.
 */

export type VariableVerdict =
  /** A namespaced path present in the host's variables. */
  | "known"
  /** Shape is fine and it resolves against the enclosing block, not the host list. */
  | "block-scoped"
  /** Loop reference supplied by a list block (`$.item`, `$.index`). */
  | "loop"
  /** Well-formed path, but the host does not publish it. */
  | "unknown"
  /** Not a usable reference at all (bad characters, stray dots). */
  | "malformed";

export interface VariableContext {
  /** Flattened paths the host published, e.g. `["data.name", "profile.email"]`. */
  available: string[];
  /** Inside an open `{{#each}}` / `{{#with}}`, where the context is rebased. */
  inBlockScope?: boolean;
  /** Inside a list block configured with a loop. */
  inLoop?: boolean;
}

/**
 * Handlebars' own references: `@index`/`@first`/`@last`/`@key`/`@root`, set per
 * iteration by the backend's `each`, and `this`-relative paths (the iteration or
 * `#with` context).
 *
 * Only meaningful inside a block — at top level a variable has to be a real
 * namespaced path such as `data.x` or `profile.y`.
 */
export function isBlockScopedReference(name: string): boolean {
  return /^@[a-zA-Z]\w*$/.test(name) || name === "this" || name.startsWith("this.");
}

/** Loop references a list block injects. */
export function isLoopReference(name: string): boolean {
  return name === "$.item" || name === "$.index" || name.startsWith("$.item.");
}

/** The namespace root of a path — `data` for `data.user.name`. */
export function namespaceOf(name: string): string {
  return name.split(".")[0] ?? "";
}

/**
 * The namespaces the host publishes, derived from the variables it supplied
 * rather than hardcoded — whatever roots appear there (`data`, `profile`,
 * `brand`, …) are the ones that exist for this workspace.
 */
export function knownNamespaces(available: string[]): string[] {
  return Array.from(new Set(available.map(namespaceOf).filter(Boolean)));
}

/**
 * `../` hops resolved away. A host validator knows payload paths, not
 * handlebars traversal syntax, so it must be asked about
 * `data.statement.currency` rather than `../data.statement.currency` — every
 * prefix rule rejects the latter outright.
 */
export function resolveParentPath(name: string): string {
  return name.trim().replace(/^(\.\.\/)+/, "");
}

export function classifyVariableReference(name: string, ctx: VariableContext): VariableVerdict {
  let trimmed = name.trim();
  if (!trimmed) return "malformed";

  // `{{../data.x}}` inside a block reaches out to the enclosing context, so the
  // path to judge is the one after the `../` hops. Comparing the literal string
  // against the flat variable list made every parent reference red.
  if (trimmed.startsWith("../")) {
    if (!ctx.inBlockScope) return "malformed";
    trimmed = trimmed.replace(/^(\.\.\/)+/, "");
    if (!trimmed) return "malformed";
    // The hops are resolved; judge what is left at top level, since that is
    // where it will be looked up.
    return classifyVariableReference(trimmed, { ...ctx, inBlockScope: false });
  }

  if (ctx.inLoop && isLoopReference(trimmed)) return "loop";

  if (isBlockScopedReference(trimmed)) {
    // Correct inside a block, meaningless outside one.
    return ctx.inBlockScope ? "block-scoped" : "malformed";
  }

  if (!isValidVariableName(trimmed)) return "malformed";

  // Inside a block the context is rebased, so a bare name like `id` in
  // `{{#with data.order}}` is legitimate and the host list cannot confirm it.
  if (ctx.inBlockScope) return "block-scoped";

  // With no published variables there is nothing to check against, so shape is
  // all we can require.
  if (ctx.available.length === 0) return "known";

  if (ctx.available.includes(trimmed)) return "known";

  // An object or array node such as `data.order` is a legitimate reference —
  // `{{#with data.order}}` and `{{#each data.items}}` take one — but the
  // flattened list only carries leaves, so accept any prefix of a known path.
  const prefix = `${trimmed}.`;
  return ctx.available.some((path) => path.startsWith(prefix)) ? "known" : "unknown";
}

/** Whether a reference should be shown as invalid to the author. */
export function isRejectedVariable(name: string, ctx: VariableContext): boolean {
  const verdict = classifyVariableReference(name, ctx);
  return verdict === "malformed" || verdict === "unknown";
}

/** A host-supplied validator, as `variableValidation.validate`. */
export type HostVariableValidator = (name: string, context: { isInsideLoop: boolean }) => boolean;

/**
 * The single accept/reject decision for any reference, standalone or inside a
 * helper.
 *
 * The host's validator wins when there is one: a workspace's `data.*` paths are
 * the send payload, unknowable before the send, so membership in the published
 * list is the wrong test. Checking the list ourselves is only the fallback for
 * hosts that supply no validator.
 */
export function isAcceptedVariable(
  name: string,
  ctx: VariableContext,
  hostValidate?: HostVariableValidator
): boolean {
  const verdict = classifyVariableReference(name, ctx);

  // `@index`, `@last` and `this.qty` are supplied by the enclosing block, not by
  // the host. They are not namespaced paths and never will be, so a host rule
  // that requires a `data.`/`profile.` prefix rejects every one of them. The
  // host is not asked about references it cannot know.
  if (verdict === "block-scoped" || verdict === "loop") return true;
  if (verdict === "malformed") return false;

  // Ask the host about the path it could actually know. `{{../data.x}}` inside
  // a block is a real reference to `data.x`; handing the host the `../` made
  // every prefix rule reject it, so the chip stayed red even though the
  // classifier had already resolved it.
  if (hostValidate) {
    return hostValidate(resolveParentPath(name), { isInsideLoop: Boolean(ctx.inLoop) });
  }
  return verdict === "known";
}

/**
 * Tokens in a helper's arguments that are variable references — so a helper
 * argument gets the same scrutiny as a standalone chip.
 *
 * Skips string and numeric literals, booleans and sub-expressions, which are
 * not paths. A hash argument contributes its value, not the whole token.
 */
/** A string, number or keyword literal, which is never a path. */
function isLiteral(token: string): boolean {
  return (
    /^["']/.test(token) ||
    /^-?\d/.test(token) ||
    token === "true" ||
    token === "false" ||
    token === "null" ||
    token === "undefined"
  );
}

export function variableArguments(args: string[]): string[] {
  const out: string[] = [];
  for (const arg of args) {
    const token = arg.trim();
    if (!token) continue;
    if (isLiteral(token)) continue;
    // Before the hash check: a sub-expression can contain an `=` of its own.
    // `(condition data.tier "==" "premier")` was being split on the operator,
    // yielding `=" "premier")` and flagging it as an unknown variable.
    if (token.startsWith("(")) continue; // sub-expression, walked by the caller

    // A hash argument's VALUE is a reference like any other: `{{helper
    // key=data.v}}` uses `data.v` exactly as `{{helper data.v}}` does, and
    // skipping the whole token hid it from the variable list. The key has to
    // look like a key, or a quoted operator qualifies as one.
    const hash = /^([A-Za-z_][\w-]*)=(.*)$/.exec(token);
    if (hash) {
      const value = hash[2].trim();
      if (value && !isLiteral(value) && !value.startsWith("(")) {
        out.push(value);
      }
      continue;
    }
    out.push(token);
  }
  return out;
}

/**
 * The name a `{{set "name" value}}` defines, which later references may use
 * though no host publishes it. Only a quoted literal name counts, as at send.
 */
export function nameDefinedBySet(raw: string): string | undefined {
  const inner = raw.replace(/^\{\{~?/, "").replace(/~?\}\}$/, "");
  const expr = classifyExpression(inner);
  if (expr.kind !== "helperCall" || expr.name !== "set") return undefined;
  const match = /^(["'])(.+)\1$/.exec(expr.args[0] ?? "");
  return match ? match[2] : undefined;
}
