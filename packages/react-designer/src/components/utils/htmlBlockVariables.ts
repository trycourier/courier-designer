import { segmentText } from "@/lib/utils/handlebars/segmentText";
import { expressionIconSvg, variableIconSvg } from "./chipIcons";
import { variableReferencesIn } from "@/lib/utils/handlebars/variableReferences";
import type { VariableViewMode } from "../TemplateEditor/store";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Chip markup mirroring `VariableChipBase` — same classes, so it picks up the
 * chip styling (and its has-value variant) from styles.css. It is markup rather
 * than the React component because an HTML block is injected wholesale via
 * `dangerouslySetInnerHTML`.
 */
function variableChip(name: string, value?: string): string {
  // `currentColor`, so the chip's own class decides — including its invalid
  // state — rather than a hex pinned here that no stylesheet change can reach.
  const iconColor = "currentColor";
  // Name only on the label; the value rides along in the title, matching the
  // React chip.
  const label = name;
  const title = value ? `${name}="${value}"` : name;

  return [
    `<span class="courier-variable-chip"`,
    // The label is ellipsised by the stylesheet, so carry the full text for a
    // hover, as the React chip does.
    ` title="${escapeHtml(title)}" data-variable-id="${escapeHtml(name)}">`,
    `<span class="courier-flex-shrink-0 courier-flex courier-items-center">`,
    variableIconSvg(iconColor),
    `</span><span>${escapeHtml(label)}</span></span>`,
  ].join("");
}

/**
 * Variable names written directly in an HTML block's markup.
 */
export function extractVariablesFromHtmlString(html?: string): string[] {
  if (!html) return [];
  // Helper arguments count here too; a triple-stache does not, since the editor
  // cannot reproduce the unescaped markup it renders.
  return variableReferencesIn(html, { includeTriple: false });
}

/**
 * A chip label is a single run of text. The stylesheet wraps rather than
 * ellipses now, so it can no longer collapse whitespace for us — and a newline
 * inside `{{ }}`, which a host's HTML formatter will happily insert, would
 * otherwise render as a real line break inside the chip.
 */
export function normaliseChipLabel(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Chip markup for a handlebars expression, mirroring `HandlebarsExpressionView`
 * — same classes, same `data-handlebars-kind`, same truncation — so a surface
 * that cannot mount React still presents a block exactly as the design view
 * does. Class names only: `styles.css` stays the single source of colour.
 */
function expressionChip(raw: string, kind: string, isInvalid: boolean): string {
  const inner = raw.replace(/^\{\{\{?/, "").replace(/\}?\}\}$/, "");
  const label = kind === "comment" ? "comment" : normaliseChipLabel(inner);
  const display = label;
  const classes = [
    "courier-handlebars-chip",
    isInvalid ? "courier-handlebars-chip-invalid" : "",
    `courier-handlebars-chip-${kind}`,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `<span class="${classes}" data-handlebars-kind="${escapeHtml(kind)}"`,
    ` title="${escapeHtml(raw)}">`,
    `<span class="courier-flex-shrink-0 courier-flex courier-items-center">`,
    expressionIconSvg("currentColor"),
    `</span><span>${escapeHtml(display)}</span></span>`,
  ].join("");
}

/**
 * Character ranges covered by an HTML tag.
 *
 * `{{...}}` inside a tag is ordinary in hand-written markup —
 * `href="{{data.url}}"` — and splicing chip markup in there destroys the
 * attribute. Occurrences inside these ranges are left exactly as written.
 */
function tagRanges(html: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== "<") {
      i++;
      continue;
    }
    let j = i + 1;
    let quote: '"' | "'" | null = null;
    while (j < html.length) {
      const ch = html[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      j++;
    }
    if (j >= html.length) {
      // Unclosed tag: treat the remainder as inside it rather than splicing.
      ranges.push([i, html.length]);
      break;
    }
    ranges.push([i, j]);
    i = j + 1;
  }
  return ranges;
}

const insideTag = (ranges: Array<[number, number]>, at: number): boolean =>
  ranges.some(([start, end]) => at >= start && at <= end);

/**
 * Resolves handlebars occurrences in an HTML block so it previews like the rest
 * of the template: chips in `show-variables`, rendered values in `wysiwyg`.
 *
 * Variables become value chips and everything else — block openers, `{{else}}`,
 * closers, helper calls, partials, comments — becomes a control-flow chip, the
 * same split `segmentText` makes for the design view.
 *
 * Occurrences inside an HTML tag are never substituted: see `tagRanges`.
 */
export function renderVariablesInHtmlString(
  html: string,
  variableValues: Record<string, string> = {},
  viewMode: VariableViewMode = "show-variables"
): string {
  if (!html) return html;

  const tags = tagRanges(html);
  let out = "";

  for (const segment of segmentText(html)) {
    const source = html.slice(segment.start, segment.end);

    // Never substitute inside a tag: see `tagRanges`.
    if (segment.type === "text" || insideTag(tags, segment.start)) {
      out += source;
      continue;
    }

    if (segment.type === "variable") {
      // `segmentText` has already judged this in context: `{{this.name}}` is
      // invalid on its own and valid inside `{{#each}}`. Deferring to it is what
      // keeps this surface and the design view showing the same chips — a second
      // rule here is how they drift apart.
      if (segment.isInvalid) {
        out += source;
        continue;
      }
      // A triple-stache renders unescaped markup the editor cannot reproduce.
      if (source.startsWith("{{{")) {
        out += source;
        continue;
      }
      out +=
        viewMode === "wysiwyg"
          ? escapeHtml(variableValues[segment.name] ?? "")
          : variableChip(segment.name, variableValues[segment.name]);
      continue;
    }

    // An expression is evaluated by the field-level render, not here, so in
    // preview it contributes nothing — matching the chip's own behaviour.
    out += viewMode === "wysiwyg" ? "" : expressionChip(source, segment.kind, segment.isInvalid);
  }

  return out;
}
