import type { RenderEngine } from "@/types";

/**
 * Root namespaces whose variables resolve under Liquid. Send variables are
 * exposed only via `data.*`; `profile`/`brand`/`urls` are named globals.
 * (See the backend's Liquid render engine: data-only variable access.)
 */
export const LIQUID_VARIABLE_ROOTS = ["data", "profile", "brand", "urls"];

/**
 * Validates a variable name according to JSON property name rules.
 * Also allows `$` as a valid identifier character to support loop
 * references (e.g. `$.item.name`, `$.index`).
 *
 * Valid: user.firstName, company.address.street, _private, user123, $.item.name, $.index
 * Invalid: user. firstName (space), user. (trailing dot), user..name (double dot), 123invalid (starts with digit)
 *
 * @param variableName - The variable name to validate (without curly braces)
 * @param engine - The rendering engine. Liquid permits filters, bracket
 *   indexing, and requires a known namespace root. Defaults to Handlebars.
 * @returns true if the variable name is valid, false otherwise
 */
export function isValidVariableName(
  variableName: string,
  engine: RenderEngine = "handlebars"
): boolean {
  // Remove leading/trailing whitespace for validation
  const trimmed = variableName.trim();

  // Empty or whitespace-only is invalid
  if (!trimmed) {
    return false;
  }

  if (engine === "liquid") {
    return isValidLiquidExpression(trimmed);
  }

  return isValidHandlebarsName(trimmed);
}

/** Handlebars rules: dotted identifier paths, no filters or brackets. */
function isValidHandlebarsName(trimmed: string): boolean {
  // Cannot start or end with a dot
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) {
    return false;
  }

  // Cannot have consecutive dots
  if (trimmed.includes("..")) {
    return false;
  }

  // Cannot contain spaces
  if (trimmed.includes(" ")) {
    return false;
  }

  // Split by dots and validate each segment
  const segments = trimmed.split(".");

  // Each segment must be a valid identifier
  // Valid identifier: starts with letter, underscore, or $, followed by letters, digits, underscores, or $
  const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

  for (const segment of segments) {
    // Empty segments are invalid (handles double dots, but we already check for that above)
    if (!segment) {
      return false;
    }

    // Each segment must match identifier pattern
    if (!identifierRegex.test(segment)) {
      return false;
    }
  }

  return true;
}

/**
 * Liquid rules: a variable path (with optional dot/bracket access) rooted in a
 * known namespace, optionally followed by one or more filters.
 * Examples: `data.name`, `data.items[0].title`, `data['key']`,
 *   `data.price | times: 1.1`, `data.name | upcase | truncate: 10`.
 */
function isValidLiquidExpression(expr: string): boolean {
  const [pathPart, ...filterParts] = splitTopLevelPipes(expr);

  if (!isValidLiquidPath(pathPart.trim())) {
    return false;
  }

  return filterParts.every((filter) => isValidLiquidFilter(filter.trim()));
}

// Leading identifier (the root segment) of a variable path.
const ROOT_SEGMENT_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*/;

// A variable path: a root identifier followed by any mix of `.segment`,
// `[<int>]` (incl. negative), `['key']`, `["key"]`, or `[var.path]` access.
const LIQUID_PATH_REGEX =
  /^[a-zA-Z_$][a-zA-Z0-9_$]*((\.[a-zA-Z_$][a-zA-Z0-9_$]*)|(\[\s*-?\d+\s*\])|(\[\s*'[^']*'\s*\])|(\[\s*"[^"]*"\s*\])|(\[\s*[a-zA-Z_$][a-zA-Z0-9_$.]*\s*\]))*$/;

/** Root (first) segment of a variable path, e.g. `data` from `data.items[0]`. */
function rootSegment(path: string): string {
  return ROOT_SEGMENT_REGEX.exec(path)?.[0] ?? "";
}

function isValidLiquidPath(path: string): boolean {
  if (!path || !LIQUID_PATH_REGEX.test(path)) {
    return false;
  }
  const root = rootSegment(path);
  // Send variables resolve only under a known namespace root; `$` keeps loop
  // references from being flagged.
  return LIQUID_VARIABLE_ROOTS.includes(root) || root === "$";
}

/**
 * Lenient filter check: a filter name, optionally followed by `: args`. Argument
 * shapes are not deeply validated — the renderer fails loud on truly invalid
 * filters; the editor's job is only to avoid red-flagging legitimate Liquid.
 */
function isValidLiquidFilter(filter: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*\s*(:\s*\S.*)?$/.test(filter);
}

/** Split on top-level `|` pipes, ignoring pipes inside single/double quotes. */
function splitTopLevelPipes(expr: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (const ch of expr) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === "|") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

/**
 * Ensures a variable name is rooted in a Liquid namespace. Names already rooted
 * in a known namespace (or loop `$`) are returned unchanged; bare names are
 * prefixed with `data.` so they resolve under Liquid's data-only access.
 */
export function ensureLiquidNamespace(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return trimmed;
  }
  const root = rootSegment(trimmed);
  if (LIQUID_VARIABLE_ROOTS.includes(root) || root === "$") {
    return trimmed;
  }
  return `data.${trimmed}`;
}
