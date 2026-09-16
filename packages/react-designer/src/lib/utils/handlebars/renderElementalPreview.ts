import { renderHandlebarsPreview } from "./renderPreview";
import { validateHandlebars } from "./validateHandlebars";

/**
 * Elemental fields the renderer evaluates handlebars in. Anything not listed
 * here is structural (colours, padding, alignment) and is left alone.
 */
const RENDERABLE_KEYS = new Set(["content", "title", "href", "alt", "src", "preheader", "text"]);

export interface ElementalPreviewResult<T> {
  content: T;
  /** Helpers whose preview output cannot match send time. */
  approximated: string[];
  /** Compile/runtime failures, keyed by the text that failed. */
  errors: string[];
}

interface StringPart {
  type: "string";
  content?: string;
  [key: string]: unknown;
}

function isStringPart(value: unknown): value is StringPart {
  return !!value && typeof value === "object" && (value as StringPart).type === "string";
}

/** A block opened or closed inside one part but not balanced within it. */
function hasUnbalancedBlock(text: string): boolean {
  return validateHandlebars(text).some(
    (issue) =>
      issue.code === "unclosed-block" ||
      issue.code === "unexpected-close" ||
      issue.code === "mismatched-close"
  );
}

/**
 * The editor stores a text block as a run of `{ type: "string" }` parts, one per
 * formatting change — so `{{#if}}`, the text it guards and `{{/if}}` routinely
 * land in different parts. Rendering each part on its own would run three
 * unrelated templates and emit every branch, so a run whose parts are
 * individually unbalanced is joined and rendered as the single template it is.
 *
 * Per-part formatting cannot survive that join, so it is only done when some
 * part is actually unbalanced; a run of self-contained parts keeps its marks.
 */
function renderStringRun(
  parts: unknown[],
  data: Record<string, unknown>,
  onResult: (approx: string[], error?: string) => void
): unknown[] | null {
  const stringParts = parts.filter(isStringPart);
  if (stringParts.length !== parts.length || stringParts.length < 2) return null;

  const needsJoin = stringParts.some((part) => hasUnbalancedBlock(part.content ?? ""));
  if (!needsJoin) return null;

  const joined = stringParts.map((part) => part.content ?? "").join("");
  const result = renderHandlebarsPreview(joined, data);
  onResult(result.approximated, result.ok ? undefined : result.error);

  // Keep the first part's styling for the rendered output.
  const { content: _dropped, ...rest } = stringParts[0];
  void _dropped;
  return [{ ...rest, type: "string", content: result.text }];
}

/**
 * Render every handlebars-bearing field of an elemental tree against preview
 * data, returning a new tree.
 *
 * Rendering a whole field (rather than one expression at a time) is what makes
 * `{{#if}}…{{else}}…{{/if}}` collapse to the branch the data selects, which is
 * the point of the preview.
 */
export function renderElementalPreview<T>(
  content: T,
  data: Record<string, unknown> = {}
): ElementalPreviewResult<T> {
  const approximated = new Set<string>();
  const errors: string[] = [];

  const collect = (approx: string[], error?: string) => {
    approx.forEach((name) => approximated.add(name));
    if (error) errors.push(error);
  };

  const walk = (value: unknown, key?: string): unknown => {
    if (typeof value === "string") {
      if (!key || !RENDERABLE_KEYS.has(key)) return value;
      const result = renderHandlebarsPreview(value, data);
      collect(result.approximated, result.ok ? undefined : result.error);
      return result.text;
    }

    if (Array.isArray(value)) {
      if (key === "elements") {
        const joined = renderStringRun(value, data, collect);
        if (joined) return joined;
      }
      return value.map((item) => walk(item));
    }

    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = walk(v, k);
      }
      return out;
    }

    return value;
  };

  return {
    content: walk(content) as T,
    approximated: Array.from(approximated),
    errors,
  };
}
