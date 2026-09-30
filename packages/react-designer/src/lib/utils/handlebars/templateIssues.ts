import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { rejectedVariablesIn } from "./rejectedVariables";
import { scanHandlebars } from "./scanHandlebars";
import type { HostVariableValidator } from "./variableRules";
import type {
  HandlebarsIssue,
  HandlebarsIssueCode,
  ValidateHandlebarsOptions,
} from "./validateHandlebars";
import { hasUnbalancedBlock, validateHandlebars } from "./validateHandlebars";
import { isParseableJs } from "./jsExpression";

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
 * Re-measured 2026-09-28: `condition` short of operands kills the send too.
 */
const SEVERITY_BY_CODE: Record<HandlebarsIssueCode, TemplateIssueSeverity> = {
  unterminated: "blocking",
  "unknown-helper": "blocking",
  "unclosed-block": "blocking",
  "unexpected-close": "blocking",
  "mismatched-close": "blocking",
  "bad-condition-operator": "blocking",
  "bad-filter-operator": "blocking",
  // Per-occurrence, which the issue carries in `sendSeverity`: the renderer's
  // assertion counts the options hash, so nothing or one operand throws while
  // two comes out false and delivers.
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
  // The backend's `range` recurses with no guard for a step of 0, so the send
  // dies with "Maximum call stack size exceeded".
  "range-step": "blocking",
  // `if` and `loop` are JavaScript the send runs; one that does not parse
  // fails every send.
  "bad-condition-expression": "blocking",
  "bad-loop-expression": "blocking",
  // Per-occurrence: blocking only where the renderer throws on the `undefined`
  // a bare path resolves to, which the issue itself carries in `sendSeverity`.
  "unscoped-path": "warning",
  // The renderer compiles each field: anything the parser rejects, or a path
  // left ending in a dot, takes the whole send with it.
  "parse-error": "blocking",
  "trailing-dot": "blocking",
  // Every entry in `MINIMUM_ARGUMENTS` was measured throwing at send.
  "helper-arity": "blocking",
  // A literal the renderer rejects outright: a reserved `set` name, a search
  // it cannot compile, a date format it cannot read, a named intl format
  // nothing defines.
  "bad-literal-argument": "blocking",
  // The host's own judgement, not handlebars': the send compiles and delivers
  // an empty string where the value would be.
  "rejected-variable": "warning",
};

export function severityForCode(code: HandlebarsIssueCode): TemplateIssueSeverity {
  return SEVERITY_BY_CODE[code] ?? "warning";
}

/**
 * An issue's severity, honouring a per-occurrence override.
 *
 * Prefer this to `severityForCode` anywhere a whole issue is in hand: one code
 * can cover both a send that dies and one that only renders wrong.
 */
export function severityOfIssue(
  issue: Pick<HandlebarsIssue, "code" | "sendSeverity">
): TemplateIssueSeverity {
  return issue.sendSeverity ?? severityForCode(issue.code);
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

/**
 * Elemental keys whose text the renderer evaluates handlebars in.
 *
 * `alt_text` is deliberately absent: verified with real sends, the backend
 * delivers it literally and an unclosed block in it does not break the send, so
 * reporting one disabled Publish and Send test for a template that sends.
 */
const TEXT_FIELDS = [
  "content",
  "title",
  "href",
  "src",
  "preheader",
  "text",
  "subject",
  "imgHref",
  "imgSrc",
] as const;

/**
 * What a host has to hand over for the variable warnings to be judged here
 * rather than only behind the chips' own atoms.
 *
 * Without either of these nothing changes: no host validator and no published
 * list means no `rejected-variable` issue, which is the behaviour every caller
 * had before.
 */
export interface TemplateIssueOptions {
  /** Flattened paths the workspace publishes, as `availableVariablesAtom` holds them. */
  availableVariables?: string[];
  /** The host's validator, as `variableValidationAtom` holds it. */
  variableValidation?: {
    validate?: HostVariableValidator;
    describeInvalid?: (name: string) => string;
  };
}

/**
 * The host-rejected names in one field, as issues the gutter can pin.
 *
 * A warning, never blocking: the send delivers the message with an empty string
 * where the value would have been, exactly as it does for a name the host has
 * simply not published yet.
 */
/**
 * Codes that already say everything there is to say about one occurrence.
 *
 * `{{var "name"}}` under strict scope is a single problem, and both checks had
 * a line about it — `unscoped-path` naming the fix ("use `data.name`") and the
 * host's rule naming the prefixes. Two issues on one expression made a host
 * count it twice and the pill read "2 warnings".
 */
const SPEAKS_FOR_THE_OCCURRENCE = new Set<HandlebarsIssueCode>(["unscoped-path"]);

function rejectedVariableIssues(
  text: string,
  base: Omit<TemplateIssue, "severity" | "code" | "message" | "raw" | "occurrence">,
  options: TemplateIssueOptions | undefined,
  already: TemplateIssue[] = []
): TemplateIssue[] {
  const spoken = new Set(
    already.filter((issue) => SPEAKS_FOR_THE_OCCURRENCE.has(issue.code)).map((issue) => issue.start)
  );
  const validation = options?.variableValidation;
  const found = rejectedVariablesIn(text, {
    available: options?.availableVariables ?? [],
    hostValidate: validation?.validate,
  });

  return found
    .filter((hit) => !spoken.has(hit.start))
    .map((hit, index) => {
      const message =
        validation?.describeInvalid?.(hit.name) ??
        `\`${hit.name}\` is not a variable this workspace publishes.`;
      return {
        ...base,
        severity: "warning" as const,
        code: "rejected-variable",
        message: base.locale ? `${message} (${base.locale} translation)` : message,
        raw: hit.raw,
        occurrence: index,
        start: hit.start,
        end: hit.end,
      };
    });
}

function issuesInText(
  text: string,
  base: Omit<TemplateIssue, "severity" | "code" | "message" | "raw" | "occurrence">,
  options?: ValidateHandlebarsOptions
): TemplateIssue[] {
  // The channel decides which per-channel helpers exist, so it travels with the
  // text: `{{markdown x}}` renders in a Slack block and kills an email send.
  const found = validateHandlebars(text, { ...options, channel: base.channel });
  if (!found.length) return [];

  const spans = scanHandlebars(text);
  return found.map((issue, index) => {
    const span = issue.start === undefined ? undefined : spans.find((s) => s.start === issue.start);
    return {
      ...base,
      severity: severityOfIssue(issue),
      code: issue.code,
      message: base.locale ? `${issue.message} (${base.locale} translation)` : issue.message,
      // An issue that does not sit on a `{{…}}` carries its own snippet: a
      // parse failure, an opener with no closer.
      raw: issue.raw ?? span?.raw ?? "",
      occurrence: index,
      ...(issue.start === undefined ? {} : { start: issue.start }),
      ...(issue.end === undefined ? {} : { end: issue.end }),
    };
  });
}

/**
 * The only `raw` field the send interpolates.
 *
 * Verified in the backend: `get-channel-overrides.ts` copies `element.raw`
 * across and transforms only `html`, `render-templates.ts` passes a channel
 * override through without compiling it, and `evaluate-hbs.ts` evaluates only
 * `content`, `title`, `href` and `src`. A `raw.subject` therefore reaches the
 * reader exactly as written — flagging handlebars there blocked Send test for a
 * template that sends fine.
 */
const INTERPOLATED_RAW_FIELDS = new Set(["html"]);

function rawIssues(
  raw: unknown,
  base: Pick<TemplateIssue, "channel" | "elementIndex" | "locale">,
  out: TemplateIssue[]
): void {
  if (!raw || typeof raw !== "object") return;
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!INTERPOLATED_RAW_FIELDS.has(field)) continue;
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
  out: TemplateIssue[],
  options?: TemplateIssueOptions
): void {
  const locales = record.locales;
  if (!locales || typeof locales !== "object") return;
  for (const [locale, entry] of Object.entries(locales as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    rawIssues((entry as Record<string, unknown>).raw, { channel, elementIndex, locale }, out);
    if (elementIndex !== undefined) {
      walkElement(entry as Record<string, unknown>, channel, elementIndex, out, locale, options);
    }
  }
}

function walkElement(
  node: ElementalNode | Record<string, unknown>,
  channel: string,
  elementIndex: number,
  out: TemplateIssue[],
  locale?: string,
  options?: TemplateIssueOptions
): void {
  // A draft in the editor is not the API's output: a `null` among the elements
  // threw `Cannot read properties of null` and took the WHOLE issue list with
  // it, so a host gating Publish on `useTemplateIssues()` saw no issues at all.
  // Skipping is the failing-open behaviour the rest of this module promises.
  if (!node || typeof node !== "object" || Array.isArray(node)) return;

  const record = node as Record<string, unknown>;
  const at = { channel, elementIndex, ...(locale ? { locale } : {}) };

  for (const field of TEXT_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.includes("{{")) {
      const at_field = { ...at, field };
      const found = issuesInText(value, at_field);
      out.push(...found);
      out.push(...rejectedVariableIssues(value, at_field, options, found));
    }
  }

  // `if` and `loop` are JavaScript the send runs in a vm2 sandbox
  // (`filter-conditionals.ts`, `loop-evaluation.ts`), not handlebars. One that
  // does not parse fails every send, and nothing said so.
  for (const [field, code] of [
    ["if", "bad-condition-expression"],
    ["loop", "bad-loop-expression"],
  ] as const) {
    const value = record[field];
    if (typeof value !== "string" || isParseableJs(value)) continue;
    out.push({
      severity: severityForCode(code),
      code,
      message:
        field === "if"
          ? "This condition is not valid JavaScript, so every send of this template fails."
          : "This loop is not valid JavaScript, so every send of this template fails.",
      ...at,
      field,
      raw: value,
      occurrence: 0,
    });
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
  // A run of `string` parts gets no second, data-scoped substitution pass at
  // send, so a bare `{{var "name"}}` here reaches the reader as `{name}` —
  // unlike the same expression in this node's own `content` or a meta title.
  const joinedIssues = joined.includes("{{")
    ? issuesInText(joined, { ...at, field: "content" }, { varFallsBackToData: false })
    : [];
  out.push(...joinedIssues);

  // Rejected names are judged PER PART, not on the joined run: a `{{set}}`
  // reaches only the part that holds it, so judging the join would put a name
  // in scope for parts the send never gives it to. Offsets are shifted into the
  // joined run so a pill still lands where the text is.
  if (joined.includes("{{")) {
    let offset = 0;
    let occurrence = 0;
    for (const part of strings) {
      const partSource = partText(part);
      const shift = offset;
      for (const issue of rejectedVariableIssues(
        partSource,
        { ...at, field: "content" },
        options,
        // The joined run's offsets, shifted back so they line up with this part.
        joinedIssues.map((issue) => ({ ...issue, start: (issue.start ?? 0) - shift }))
      )) {
        out.push({
          ...issue,
          occurrence: occurrence++,
          ...(issue.start === undefined ? {} : { start: issue.start + offset }),
          ...(issue.end === undefined ? {} : { end: issue.end + offset }),
        });
      }
      offset += partSource.length;
    }
  }

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
  content: ElementalContent | null | undefined,
  options?: TemplateIssueOptions
): TemplateIssue[] {
  const out: TemplateIssue[] = [];
  if (!content?.elements?.length) return out;

  for (const element of content.elements) {
    if (!element || typeof element !== "object" || Array.isArray(element)) continue;
    const record = element as unknown as Record<string, unknown>;

    if (record.type === "channel") {
      const channel = typeof record.channel === "string" ? record.channel : "template";

      // A channel's `raw` is delivered as written, apart from `html`.
      rawIssues(record.raw, { channel }, out);
      walkLocales(record, channel, undefined, out, options);

      const children = Array.isArray(record.elements) ? record.elements : [];
      children.forEach((child, index) =>
        walkElement(child, channel, index, out, undefined, options)
      );
      continue;
    }

    walkElement(element, "template", 0, out, undefined, options);
  }

  return out;
}
