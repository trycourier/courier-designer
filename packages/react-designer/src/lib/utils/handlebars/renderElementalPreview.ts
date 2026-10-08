import { renderHandlebarsPreview, renderTitlePreview } from "./renderPreview";
import { convertSingleBraceVariables } from "./singleBraceVariables";
import { hasUnbalancedBlock } from "./validateHandlebars";
import { resolveDataPath } from "@/components/utils/resolveDataPath";

/**
 * Elemental fields the renderer evaluates handlebars in. Anything not listed
 * here is structural (colours, padding, alignment) and is left alone.
 */
const RENDERABLE_KEYS = new Set(["content", "title", "href", "alt", "src", "preheader", "text"]);

/**
 * Where the send still substitutes legacy `{path}` variables, measured on real
 * sends: text and action `content` and the subject — not string runs or hrefs.
 */
const SINGLE_BRACE_FIELDS: Record<string, string> = {
  text: "content",
  action: "content",
  meta: "title",
};

export interface ElementalPreviewResult<T> {
  content: T;
  /** Helpers whose preview output cannot match send time. */
  approximated: string[];
  /** Compile/runtime failures, keyed by the text that failed. */
  errors: string[];
}

/**
 * Set on a node of the rendered tree when something under it failed to render,
 * so the text it carries is still the author's rather than the reader's. The
 * editor reads it to decide whether that text is still worth parsing back into
 * chips — rendered text is literal, unrendered text is source.
 */
export const PREVIEW_ERROR_KEY = "__previewError";

/**
 * Set on a text node that a channel lifted out of `meta.title` for editing — the
 * Inbox header and the Push title. It is still a title to the renderer, so it
 * takes the send's two passes rather than the one a body block takes. Preview
 * only: the editor builds these nodes on the way in and never saves them.
 */
export const PREVIEW_TITLE_KEY = "__previewTitle";

interface StringPart {
  type: "string";
  content?: string;
  [key: string]: unknown;
}

function isStringPart(value: unknown): value is StringPart {
  return !!value && typeof value === "object" && (value as StringPart).type === "string";
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
  const result = renderHandlebarsPreview(joined, data, { varDataFallback: false });
  onResult(result.approximated, result.ok ? undefined : result.error);

  // Keep the first part's styling for the rendered output.
  const { content: _dropped, ...rest } = stringParts[0];
  void _dropped;
  return [
    {
      ...rest,
      type: "string",
      content: result.text,
      ...(result.ok ? {} : { [PREVIEW_ERROR_KEY]: true }),
    },
  ];
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
  rootData: Record<string, unknown> = {}
): ElementalPreviewResult<T> {
  const approximated = new Set<string>();
  const errors: string[] = [];

  const collect = (approx: string[], error?: string) => {
    approx.forEach((name) => approximated.add(name));
    if (error) errors.push(error);
  };

  const walk = (
    value: unknown,
    key?: string,
    parent?: Record<string, unknown>,
    data: Record<string, unknown> = rootData
  ): unknown => {
    if (typeof value === "string") {
      if (!key || !RENDERABLE_KEYS.has(key)) return value;
      const parentType = parent?.type;
      const source =
        SINGLE_BRACE_FIELDS[String(parentType)] === key
          ? convertSingleBraceVariables(value)
          : value;
      // A `string` part gets no second, data-scoped substitution pass, so an
      // unresolved `{{var "name"}}` stays `{name}` on the wire. A block's own
      // `content` and a meta title do get one.
      // A meta title is rendered twice at send; everything else once.
      const isTitle =
        (parentType === "meta" && key === "title") ||
        (parent?.[PREVIEW_TITLE_KEY] === true && key === "content");
      const result = isTitle
        ? renderTitlePreview(source, data)
        : renderHandlebarsPreview(source, data, {
            varDataFallback: parentType !== "string",
          });
      collect(result.approximated, result.ok ? undefined : result.error);
      return result.text;
    }

    if (Array.isArray(value)) {
      if (key === "elements") {
        const joined = renderStringRun(value, data, collect);
        if (joined) return joined;
      }
      return value.flatMap(
        (item) => expandLoop(item, data) ?? [walk(item, undefined, undefined, data)]
      );
    }

    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      const node = value as Record<string, unknown>;
      const before = errors.length;
      for (const [k, v] of Object.entries(node)) {
        out[k] = walk(v, k, node, data);
      }
      // Marked for the whole subtree: a node whose child failed keeps its own
      // text as source too, and a clean child clears the flag again for itself.
      if (errors.length > before) out[PREVIEW_ERROR_KEY] = true;
      return out;
    }

    return value;
  };

  /**
   * A looped group is sent once per item, with `$.item`/`$.index` in scope, so
   * preview repeats it the same way. Without sample data to loop over it is left
   * as one unexpanded copy.
   */
  const expandLoop = (value: unknown, data: Record<string, unknown>): unknown[] | null => {
    const node = value as Record<string, unknown> | null;
    if (!node || node.type !== "group" || typeof node.loop !== "string") return null;
    const items = resolveDataPath(data, node.loop).value;
    if (!Array.isArray(items)) return null;
    const { loop: _loop, ...rest } = node;
    void _loop;
    return items.map((item, index) =>
      walk(rest, undefined, undefined, { ...data, $: { item, index } })
    );
  };

  return {
    content: walk(content) as T,
    approximated: Array.from(approximated),
    errors,
  };
}
