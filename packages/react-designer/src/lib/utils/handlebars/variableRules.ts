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
  /**
   * How many enclosing blocks have rebased the context — `{{#each}}`/`{{#with}}`
   * only, since `{{#if}}` runs its body in the same context. It is how far
   * `../` can step back and still be inside a block, which decides whether a
   * bare name there is the block's own or a path the host should know.
   */
  contextDepth?: number;
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
  // `./name` is `this.name` written the other way — handlebars' explicit
  // "current context" prefix, which an author reaches for inside `{{#each}}`.
  const path = resolveCurrentContext(name);
  return /^@[a-zA-Z]\w*$/.test(path) || path === "this" || path.startsWith("this.");
}

/** `./x` rewritten as `this.x`, which is the same reference. */
export function resolveCurrentContext(name: string): string {
  return name.startsWith("./") ? `this.${name.slice(2)}` : name;
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
/**
 * Whitespace control stripped. `~` belongs to the expression, not to the path,
 * so `{{~data.x~}}` is the same reference as `{{data.x}}` — a host validator
 * given the tildes rejects it, since no payload path contains one.
 *
 * `&` goes with them: it is Handlebars' "do not escape" prefix, the older
 * spelling of `{{{…}}}`, so `{{&data.s.v}}` reads `data.s.v` and the send
 * resolves it. Handing the host the ampersand made every prefix rule reject a
 * reference that works.
 */
export function stripWhitespaceControl(name: string): string {
  return name.trim().replace(/^~/, "").replace(/~$/, "").trim().replace(/^&/, "").trim();
}

/**
 * A reference in the spelling a host's validator can recognise.
 *
 * Everything Handlebars treats as punctuation is taken off first — whitespace
 * control, the `&` unescape prefix, `../` hops — and `/` becomes `.`, since it
 * is Handlebars' older separator and `{{data/d/name}}` resolves exactly as
 * `{{data.d.name}}` does at send. A prefix rule handed any of those rejects a
 * reference the send is perfectly happy with.
 */
export function hostPathOf(name: string): string {
  return stripWhitespaceControl(resolveParentPath(stripWhitespaceControl(name))).replace(
    /\//g,
    "."
  );
}

export function resolveParentPath(name: string): string {
  return name.trim().replace(/^(\.\.\/)+/, "");
}

export function classifyVariableReference(name: string, ctx: VariableContext): VariableVerdict {
  // `~` is whitespace control on the expression, not part of the path.
  let trimmed = name.trim().replace(/^~/, "").replace(/~$/, "").trim();
  if (!trimmed) return "malformed";

  // `{{../data.x}}` inside a block reaches out to the enclosing context, so the
  // path to judge is the one after the `../` hops. Comparing the literal string
  // against the flat variable list made every parent reference red.
  if (trimmed.startsWith("../")) {
    if (!ctx.inBlockScope) return "malformed";

    const hops = (/^(?:\.\.\/)+/.exec(trimmed)?.[0].length ?? 0) / 3;
    trimmed = trimmed.replace(/^(\.\.\/)+/, "");
    if (!trimmed) return "malformed";

    // Still inside a block after stepping back: the name belongs to that
    // block's context, which no host variable list carries. `{{#each items}}
    // {{#each this.tags}}{{../name}}` is the outer item's name and renders.
    if (ctx.contextDepth !== undefined && hops < ctx.contextDepth) return "block-scoped";
    // The hops are resolved; judge what is left at top level, since that is
    // where it will be looked up. The rebasing blocks are spent with them, so
    // the remainder is not block-scoped either.
    return classifyVariableReference(trimmed, {
      ...ctx,
      inBlockScope: false,
      contextDepth: 0,
    });
  }

  trimmed = resolveCurrentContext(trimmed);

  if (ctx.inLoop && isLoopReference(trimmed)) return "loop";

  // A dotted `@` path reads the renderer's data frame, which is seeded with every
  // root key plus the recipient profile — `{{@profile.first_name}}` and
  // `{{@data.name}}` resolve at send, at top level as well as inside a block.
  // Like `@index`, they are the renderer's own references, so a host's
  // `data.`/`profile.` prefix rule is not asked about them.
  if (trimmed.startsWith("@") && trimmed.includes(".")) {
    const path = trimmed.slice(1).replace(/^root\./, "");
    return isValidVariableName(path) ? "block-scoped" : "malformed";
  }

  if (isBlockScopedReference(trimmed)) {
    // Correct inside a block, meaningless outside one.
    return ctx.inBlockScope ? "block-scoped" : "malformed";
  }

  if (!isValidVariableName(trimmed)) return "malformed";

  // Only a block that REBASES the context makes a bare name legitimate:
  // `{{#with data.order}}{{id}}` reads the order's own `id`, which no host list
  // can confirm. `{{#if data.x}}{{name}}` does not rebase anything — `name` is
  // read at the root there — so the host still has to judge it, and treating
  // every block alike let a bare name through inside an `{{#if}}`.
  //
  // `contextDepth` is what counts those blocks. A caller that does not compute
  // it falls back to the old reading rather than suddenly rejecting names it
  // used to accept.
  const rebased = ctx.contextDepth === undefined ? ctx.inBlockScope : ctx.contextDepth > 0;
  if (rebased) return "block-scoped";

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
    return hostValidate(hostPathOf(name), { isInsideLoop: Boolean(ctx.inLoop) });
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

/**
 * Helpers that name their path as a string LITERAL rather than reading a path.
 *
 * `var`/`inline-var` do `variableHandler.replace("{" + path + "}")`, so the
 * quoted token resolves like a legacy single-brace variable — it is a
 * reference, not a string. Measured on dev with strict scope:
 * `{{var "tenant.name"}}` renders the tenant's name, and with no tenant leaves
 * the literal `{tenant.name}`, which is what drops a subject.
 */
const PATH_LITERAL_HELPERS = new Set(["var", "inline-var"]);

/** The quoted path a `var`/`inline-var` call names, if it named one. */
export function varLiteralPath(name: string, args: string[]): string | undefined {
  if (!PATH_LITERAL_HELPERS.has(name)) return undefined;
  const raw = args[0]?.trim();
  if (!raw || !/^["'].*["']$/.test(raw)) return undefined;
  return raw.slice(1, -1).trim() || undefined;
}

/**
 * The arguments of one call that are variable references — the plain paths, and
 * the quoted path of a `var`/`inline-var`.
 *
 * Both the chip and the reference walk go through here, so a helper whose
 * literal is really a path cannot be judged one way in the editor and another
 * in Preview & Test's inputs.
 */
export function helperPathArguments(expr: { name: string; args: string[] }): string[] {
  const literal = varLiteralPath(expr.name, expr.args);
  return literal ? [literal] : variableArguments(expr.args);
}

export function variableArguments(args: string[]): string[] {
  const out: string[] = [];
  for (const arg of args) {
    const token = arg.trim();
    if (!token) continue;
    if (isLiteral(token)) continue;
    // A bare comparison operator is a syntax error, reported as one. It is not
    // a variable, and warning that it "must start with data." on top of the
    // real error points the author at the wrong thing.
    if (/^(===?|!==?|<=?|>=?)$/.test(token)) continue;
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
        out.push(stripWhitespaceControl(value));
      }
      continue;
    }
    // Whitespace control belongs to the expression, not to the argument.
    out.push(stripWhitespaceControl(token));
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
