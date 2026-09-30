import { CONTEXT_BLOCKS } from "./blockContext";
import { classifyExpression, expressionValues } from "./classifyExpression";
import { scanHandlebars } from "./scanHandlebars";
import { setDefinedNamesInPart } from "./setScope";
import type { HostVariableValidator } from "./variableRules";
import { helperPathArguments, isAcceptedVariable } from "./variableRules";

/** One reference the host's validator turned down, and where it sits. */
export interface RejectedVariable {
  name: string;
  /** Offset of the whole `{{…}}`, matching the other issues' spans. */
  start: number;
  end: number;
  raw: string;
}

/** What it takes to judge a name the way a chip judges it. */
export interface RejectedVariableOptions {
  /** Flattened paths the host published, as the chips see them. */
  available?: string[];
  /** The host's own validator, from `variableValidationAtom.validate`. */
  hostValidate?: HostVariableValidator;
}

/**
 * The references in a run of text that the host's validator turns down.
 *
 * The chips have always judged these, through `isAcceptedVariable`, but only
 * behind their own atoms — so a host counting `useTemplateIssues()` and a canvas
 * drawing pills disagreed about how many warnings a template had. Same rules,
 * same source of truth, reported as issues so both read one list.
 *
 * Scope is tracked exactly as the chip's is: inside `{{#each}}`/`{{#with}}` a
 * bare name is the block's own and is never put to the host, and `{{#if}}` does
 * not rebase the context, so a name inside one still is.
 */
export function rejectedVariablesIn(
  text: string,
  { available = [], hostValidate }: RejectedVariableOptions = {}
): RejectedVariable[] {
  if (!text || !text.includes("{{")) return [];
  if (!hostValidate && !available.length) return [];

  const out: RejectedVariable[] = [];
  const open: boolean[] = [];
  // `{{set}}` defines a name for the rest of its own stored part and no
  // further, because the send compiles each part on its own. The same rule the
  // chips follow, from the same function — pass one part's text at a time and
  // the scope comes out right on both sides of the boundary.
  const definedBySet = setDefinedNamesInPart(text);

  for (const span of scanHandlebars(text)) {
    const expr = classifyExpression(span.inner, span.triple);
    const ctx = {
      available,
      inBlockScope: open.length > 0,
      inLoop: false,
      contextDepth: open.filter(Boolean).length,
    };

    const judge = (name: string) => {
      if (!name || definedBySet.includes(name)) return;
      if (isAcceptedVariable(name, ctx, hostValidate)) return;
      out.push({ name, start: span.start, end: span.end, raw: span.raw });
    };

    if (expr.kind === "variable") {
      judge(expr.name);
    } else {
      // A helper's arguments are judged as a standalone chip is — including a
      // `var`/`inline-var` path, which is quoted but is a reference.
      const walk = (node: typeof expr) => {
        for (const name of helperPathArguments(node)) judge(name);
        for (const arg of expressionValues(node)) {
          if (arg.startsWith("("))
            walk(classifyExpression(arg.replace(/^\(/, "").replace(/\)$/, "")));
        }
      };
      walk(expr);
    }

    if (expr.kind === "blockOpen" || expr.kind === "blockInverseOpen") {
      open.push(CONTEXT_BLOCKS.has(expr.name));
    } else if (expr.kind === "blockClose") {
      open.pop();
    }
  }

  return out;
}
