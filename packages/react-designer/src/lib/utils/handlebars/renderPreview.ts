import Handlebars from "handlebars";
import { classifyExpression } from "./classifyExpression";
import {
  APPROXIMATED_HELPERS,
  registerPreviewHelpers,
  substituteDataVariables,
} from "./previewHelpers";
import { scanHandlebars } from "./scanHandlebars";
import { VARIABLE_PATTERN } from "./singleBraceVariables";

export interface HandlebarsPreviewResult {
  /** The rendered output, or the original text when rendering failed. */
  text: string;
  /** True when the template compiled and ran. */
  ok: boolean;
  /** Compile/runtime message, for surfacing to the author. */
  error?: string;
  /**
   * Helpers whose editor stand-in cannot match send time (translations, link
   * tracking, partials). Their presence means the preview is indicative only.
   */
  approximated: string[];
  /**
   * The unresolved `{…}` placeholders that made the send DROP this field, set
   * only in that branch — so a host can say "the send drops this subject:
   * tenant.name has no value" instead of showing a silent blank.
   */
  dropped?: string[];
}

let env: typeof Handlebars | null = null;

function subExpressionNames(inner: string): string[] {
  const names: string[] = [];
  const pattern = /\(\s*([^\s()]+)/g;
  for (let m = pattern.exec(inner); m; m = pattern.exec(inner)) names.push(m[1]);
  return names;
}

function getEnv(): typeof Handlebars {
  if (!env) {
    env = Handlebars.create();
    registerPreviewHelpers(env);
  }
  return env;
}

/**
 * Measured: the send drops null-valued keys from objects, nested ones too, so a
 * helper sees `undefined`. Arrays are left alone: a `null` element, or a null key
 * of an object inside an array, reaches the helper as `null`.
 */
function dropNullKeys(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== null) out[key] = dropNullKeys(item);
  }
  return out;
}

/** Reset the shared environment. Test seam. */
export function resetPreviewEnv(): void {
  env = null;
}

/**
 * Render one field's text against preview data.
 *
 * This runs the whole field, not one expression at a time, because a block
 * spans several expressions and the text between them — rendering `{{#if}}`
 * alone would tell the author nothing about which branch they get.
 *
 * On any failure the original text is returned unchanged: a preview is never
 * worth destroying what the author wrote.
 */
export interface HandlebarsPreviewOptions {
  /**
   * Whether the send's second, data-scoped substitution pass runs over the
   * rendered text, filling in the `{name}` an unresolved `{{var "name"}}` left
   * behind. Measured on dev: it does for a block's `content` string and a meta
   * title, and does NOT for the `string` parts the designer saves text as,
   * where `{name}` reaches the reader. Pass `false` for those.
   */
  varDataFallback?: boolean;
}

export function renderHandlebarsPreview(
  text: string,
  data: Record<string, unknown> = {},
  options: HandlebarsPreviewOptions = {}
): HandlebarsPreviewResult {
  // Only skip when there is no handlebars at all. An unterminated `{{` yields
  // no SPANS, so keying the shortcut on the scanner declared it renderable and
  // passed the braces through — while `collectTemplateIssues` called it
  // blocking and the backend refused to compile it. Two answers to the same
  // question. Let it reach the compiler, which fails exactly as the send does.
  if (!text || !text.includes("{{")) {
    return { text, ok: true, approximated: [] };
  }

  // Sub-expressions count too: `{{#if (filter "profile" …)}}` is approximate
  // even though the outer helper is `if`.
  const approximated = Array.from(
    new Set(
      scanHandlebars(text)
        .flatMap((span) => [
          classifyExpression(span.inner, span.triple).name,
          ...subExpressionNames(span.inner),
        ])
        .filter((name) => APPROXIMATED_HELPERS.has(name))
    )
  );

  try {
    const template = getEnv().compile(text, { noEscape: true });
    const root = dropNullKeys(data) as Record<string, unknown>;
    // The renderer seeds the data frame with every root key, so `@data`,
    // `@profile` and the rest resolve the way `@root` does. Block helpers still
    // build their own frames from it, so `@index`/`@first` are unaffected.
    const rendered = template(root, {
      data: { ...root, root, profile: root.profile },
    });
    return {
      text: options.varDataFallback === false ? rendered : substituteDataVariables(rendered, root),
      ok: true,
      approximated,
    };
  } catch (error) {
    return {
      text,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      approximated,
    };
  }
}

/**
 * Render a meta title the way the send does: twice.
 *
 * `render-templates.ts` renders the title once with the whole template, then
 * renders the OUTPUT again with the context scoped to `data` (C-21161). So a
 * title whose data carried `{{s.name}}` resolves it on the second pass, while
 * `{{data.s.name}}` — correct on the first pass — resolves to nothing on the
 * second, because `data` is already the context there.
 *
 * Exported so a host's subject bar renders a title exactly as the canvas does.
 */
/**
 * The `{…}` placeholders left in a rendered single-value field, in the order
 * they appear and without repeats.
 *
 * `VARIABLE_PATTERN` is the backend's own, and carries no `g` flag — it is used
 * with `split` elsewhere — so this makes its own global copy rather than
 * mutating shared state through `lastIndex`.
 */
function droppedPlaceholders(text: string): string[] {
  const pattern = new RegExp(VARIABLE_PATTERN.source, "g");
  const out = new Set<string>();
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    out.add(match[1].trim());
  }
  return Array.from(out);
}

export function renderTitlePreview(
  text: string,
  data: Record<string, unknown> = {}
): HandlebarsPreviewResult {
  const first = renderHandlebarsPreview(text, data);
  if (!first.ok) return first;

  const scoped = (data.data ?? {}) as Record<string, unknown>;
  const second = renderHandlebarsPreview(first.text, scoped);
  const approximated = Array.from(new Set([...first.approximated, ...second.approximated]));
  if (!second.ok) return { ...second, text: first.text, approximated };
  // `handlebars/template/text.ts`: a single-value field — a subject, a from, a
  // reply-to — is dropped for its default when the rendered text still holds an
  // unresolved `{…}`, rather than delivered with the placeholder in it. So a
  // title the author can still see a `{nope}` in is a message that arrives with
  // NO subject at all, and the preview has to show that emptiness.
  const unresolved = droppedPlaceholders(second.text);
  if (unresolved.length) {
    return { ...second, text: "", approximated, dropped: unresolved };
  }
  return { ...second, approximated };
}
