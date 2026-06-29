import type { RenderEngine } from "@/types";
import { LIQUID_TAG_TOKEN_SOURCE } from "./liquidTagToken";

// Matches a whole `{{ ... }}` variable token. The inner group excludes `}` so
// it never spans across two adjacent tokens.
const VARIABLE_TOKEN_REGEX = /\{\{\s*([^}]*?)\s*\}\}/g;

// Quote-aware `{% ... %}` tag matcher (shared with the parser).
const TAG_TOKEN_REGEX = new RegExp(LIQUID_TAG_TOKEN_SOURCE, "g");

/** Rewrite a single string's `{{ }}`/`{% %}` tokens to Liquid's spaced form. */
function rewriteString(value: string): string {
  let result = value;

  if (result.includes("{{")) {
    result = result.replace(
      VARIABLE_TOKEN_REGEX,
      (_match, inner: string) => `{{ ${inner.trim()} }}`
    );
  }

  if (result.includes("{%")) {
    result = result.replace(TAG_TOKEN_REGEX, (_match, inner: string) => `{% ${inner.trim()} %}`);
  }

  return result;
}

/**
 * Recursively normalizes variable/tag token spacing to Liquid's `{{ x }}` /
 * `{% x %}` form across every string in a value.
 *
 * This is a **no-op for non-Liquid engines** — Handlebars content is returned
 * untouched so externally/API-authored templates aren't silently rewritten on
 * save (and the whole tree walk is skipped).
 */
export function normalizeVariableSpacing<T>(value: T, engine: RenderEngine): T {
  if (engine !== "liquid") {
    return value;
  }

  if (typeof value === "string") {
    return rewriteString(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeVariableSpacing(item, engine)) as unknown as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = normalizeVariableSpacing(val, engine);
    }
    return result as T;
  }

  return value;
}
