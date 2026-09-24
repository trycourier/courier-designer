import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { scanHandlebars } from "./scanHandlebars";
import type { HandlebarsIssueCode } from "./validateHandlebars";
import { hasUnbalancedBlock, validateHandlebars } from "./validateHandlebars";

/**
 * Whether an issue stops the send, or merely looks wrong.
 *
 * This tracks the RENDERER, not the editor. The editor is deliberately stricter
 * in places — `condition-arity` draws a red chip but the backend renders `""`
 * and delivers the message (C-21087) — so a host that gated on "the chip is
 * red" would block sends the backend accepts. Gate on `severity`, never on
 * `code`: a code added later arrives with a severity and the gate keeps working.
 */
export type TemplateIssueSeverity = "blocking" | "warning";

/**
 * Measured against real sends of the 87-case matrix, not inferred:
 * - parse errors take the whole template, every channel with it
 * - `Missing helper: "frobnicate"` is undeliverable
 * - `condition` rejects an unknown operator outright
 * - `filter` throws `Invalid Operator` and the message never renders
 * - an unterminated mustache is `Expecting 'ID', got 'INVALID'`, no output at all
 * Against which `condition-arity` renders `""` and delivers.
 */
const SEVERITY_BY_CODE: Record<HandlebarsIssueCode, TemplateIssueSeverity> = {
  unterminated: "blocking",
  "unknown-helper": "blocking",
  "unclosed-block": "blocking",
  "unexpected-close": "blocking",
  "mismatched-close": "blocking",
  "bad-condition-operator": "blocking",
  "bad-filter-operator": "blocking",
  "condition-arity": "warning",
  "split-block": "blocking",
  // Verified against handlebars, not assumed: `{{if x}}` throws
  // `options.fn is not a function` and a stray `{{else}}` is a parse error.
  "inline-block-helper": "blocking",
  "unexpected-else": "blocking",
  // Both verified against handlebars: a bare operator is a parse error, and
  // `{{#if a b}}` throws "#if requires exactly one argument".
  "bare-operator": "blocking",
  "if-arity": "blocking",
};

export function severityForCode(code: HandlebarsIssueCode): TemplateIssueSeverity {
  return SEVERITY_BY_CODE[code] ?? "warning";
}

export interface TemplateIssue {
  severity: TemplateIssueSeverity;
  code: HandlebarsIssueCode;
  /** Author-facing wording, the same text the chip shows. */
  message: string;
  /** `email`, `sms`, … or `template` for content outside any channel. */
  channel: string;
  /** The elemental key the text came from: `content`, `subject`, `title`, `href`… */
  field: string;
  /**
   * Index of the top-level element within its channel, for focusing. Elemental
   * carries no node ids, so this is the most specific address available.
   * Absent for a channel's `raw` fields, which are not elements.
   */
  elementIndex?: number;
  /** The offending expression, verbatim. Empty when the issue has no span. */
  raw: string;
  /** Nth issue in that field, so a repeated mistake is separately addressable. */
  occurrence: number;
  /**
   * Offsets into the FIELD's text, when the issue maps to one occurrence.
   *
   * Locating by `raw` finds the first match, which is the wrong one whenever a
   * field repeats an expression — an unclosed `{{#if data.vip}}` gets reported
   * at an earlier, correctly closed copy. Where a text block is stored as a run
   * of string parts these are offsets into the joined run, which is the text
   * the renderer compiles.
   */
  start?: number;
  end?: number;
  /** The locale override the text came from; absent for the base content. */
  locale?: string;
}

/** Elemental keys whose text the renderer evaluates handlebars in. */
const TEXT_FIELDS = [
  "content",
  "title",
  "href",
  "src",
  "alt_text",
  "preheader",
  "text",
  "subject",
  "imgHref",
  "imgSrc",
] as const;

function issuesInText(
  text: string,
  base: Omit<TemplateIssue, "severity" | "code" | "message" | "raw" | "occurrence">
): TemplateIssue[] {
  const found = validateHandlebars(text);
  if (!found.length) return [];

  const spans = scanHandlebars(text);
  return found.map((issue, index) => {
    const span = issue.start === undefined ? undefined : spans.find((s) => s.start === issue.start);
    return {
      ...base,
      severity: severityForCode(issue.code),
      code: issue.code,
      message: base.locale ? `${issue.message} (${base.locale} translation)` : issue.message,
      raw: span?.raw ?? "",
      occurrence: index,
      ...(issue.start === undefined ? {} : { start: issue.start }),
      ...(issue.end === undefined ? {} : { end: issue.end }),
    };
  });
}

function rawIssues(
  raw: unknown,
  base: Pick<TemplateIssue, "channel" | "elementIndex" | "locale">,
  out: TemplateIssue[]
): void {
  if (!raw || typeof raw !== "object") return;
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.includes("{{")) {
      out.push(...issuesInText(value, { ...base, field }));
    }
  }
}

/**
 * The send swaps a locale's fields in for the base ones and compiles them on
 * their own, so a broken expression there fails every recipient in that locale.
 */
function walkLocales(
  record: Record<string, unknown>,
  channel: string,
  elementIndex: number | undefined,
  out: TemplateIssue[]
): void {
  const locales = record.locales;
  if (!locales || typeof locales !== "object") return;
  for (const [locale, entry] of Object.entries(locales as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    rawIssues((entry as Record<string, unknown>).raw, { channel, elementIndex, locale }, out);
    if (elementIndex !== undefined) {
      walkElement(entry as Record<string, unknown>, channel, elementIndex, out, locale);
    }
  }
}

function walkElement(
  node: ElementalNode | Record<string, unknown>,
  channel: string,
  elementIndex: number,
  out: TemplateIssue[],
  locale?: string
): void {
  const record = node as Record<string, unknown>;
  const at = { channel, elementIndex, ...(locale ? { locale } : {}) };

  for (const field of TEXT_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.includes("{{")) {
      out.push(...issuesInText(value, { ...at, field }));
    }
  }

  if (!locale) walkLocales(record, channel, elementIndex, out);

  if (!Array.isArray(record.elements)) return;

  // The editor stores a text block as a run of `string` (and `link`) parts.
  // Judge the joined strings so a block opened in one part and closed in
  // another is not reported twice as unclosed and unexpected — but the backend
  // compiles every part on its own, so that split shape still fails the send
  // and has to block it.
  const parts = record.elements as Array<Record<string, unknown>>;
  const partText = (part: Record<string, unknown>) =>
    typeof part.content === "string" ? part.content : "";
  const strings = parts.filter((part) => part?.type === "string");
  const joined = strings.map(partText).join("");
  const joinedIssues = joined.includes("{{")
    ? issuesInText(joined, { ...at, field: "content" })
    : [];
  out.push(...joinedIssues);

  const inline = parts.filter((part) => part?.type === "string" || part?.type === "link");
  const split = inline.length > 1 ? inline.map(partText).find(hasUnbalancedBlock) : undefined;
  if (split !== undefined && !joinedIssues.length) {
    out.push({
      ...at,
      field: "content",
      severity: severityForCode("split-block"),
      code: "split-block",
      message: "A block helper is split across formatting runs. Edit this text to re-save it.",
      raw: split,
      occurrence: 0,
    });
  }

  for (const child of parts) {
    if (child?.type === "string") continue;
    walkElement(child as unknown as ElementalNode, channel, elementIndex, out, locale);
  }
}

/**
 * Every handlebars issue in a whole template, across every channel.
 *
 * Across every channel deliberately: the backend compiles the template as one
 * unit, so an unclosed block in a channel the author is not looking at takes the
 * entire send with it. An issue that cannot be seen still has to be nameable, or
 * a blocked send button looks like a broken one.
 *
 * Locale overrides are walked too, and their issues carry `locale`.
 */
export function collectTemplateIssues(
  content: ElementalContent | null | undefined
): TemplateIssue[] {
  const out: TemplateIssue[] = [];
  if (!content?.elements?.length) return out;

  for (const element of content.elements) {
    const record = element as unknown as Record<string, unknown>;

    if (record.type === "channel") {
      const channel = typeof record.channel === "string" ? record.channel : "template";

      // A channel's `raw` holds subject/title/text, which are compiled the same
      // way the body is and fail the send the same way.
      rawIssues(record.raw, { channel }, out);
      walkLocales(record, channel, undefined, out);

      const children = Array.isArray(record.elements) ? record.elements : [];
      children.forEach((child, index) => walkElement(child, channel, index, out));
      continue;
    }

    walkElement(element, "template", 0, out);
  }

  return out;
}
