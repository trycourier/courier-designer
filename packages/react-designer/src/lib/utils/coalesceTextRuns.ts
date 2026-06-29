/**
 * Formatting flags that distinguish one inline text run from another. Two
 * adjacent `string` elements may only merge when all of these match — merging
 * across a formatting boundary would change rendering.
 */
const FLAG_KEYS = ["bold", "italic", "strikethrough", "underline", "color"] as const;

type StringEl = { type: "string"; content?: string } & Record<string, unknown>;

function isStringEl(value: unknown): value is StringEl {
  return (
    Boolean(value) && typeof value === "object" && (value as { type?: string }).type === "string"
  );
}

function sameFlags(a: StringEl, b: StringEl): boolean {
  return FLAG_KEYS.every((key) => a[key] === b[key]);
}

/** Merge consecutive same-formatting `string` elements within one elements array. */
function coalesceStringRun(elements: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const el of elements) {
    const prev = result[result.length - 1];
    if (isStringEl(el) && isStringEl(prev) && sameFlags(prev, el)) {
      result[result.length - 1] = { ...prev, content: (prev.content ?? "") + (el.content ?? "") };
    } else {
      result.push(el);
    }
  }
  return result;
}

/**
 * Recursively merges adjacent `string` elements (with identical formatting) in
 * every `elements` array of the content tree, so a text run that was split into
 * many pieces — text, `{{ variables }}`, `{% tags %}` — becomes a single string.
 *
 * This matters for Liquid: the renderer interpolates each `string` element as
 * its own field, so a `{% if %}…{% endif %}` block split across elements is
 * invalid. Coalescing puts the whole run in one field. (Pieces in different
 * formatting runs still can't share a Liquid block — a per-field limitation.)
 */
export function coalesceTextRuns<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => coalesceTextRuns(item)) as unknown as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = coalesceTextRuns(val);
    }
    if (Array.isArray(result.elements)) {
      result.elements = coalesceStringRun(result.elements);
    }
    return result as T;
  }

  return value;
}
