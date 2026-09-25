import { describe, expect, it } from "vitest";
import { INVALID, VALID } from "./handlebarsMatrix.fixture";
import { collectTemplateIssues, severityForCode } from "./templateIssues";

const channel = (elements: unknown[], raw?: Record<string, string>) =>
  ({
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", ...(raw ? { raw } : {}), elements }],
  }) as never;

const text = (content: string) => ({ type: "text", content });

describe("severityForCode", () => {
  it("blocks the codes that stop a real send", () => {
    for (const code of [
      "unterminated",
      "unknown-helper",
      "unclosed-block",
      "unexpected-close",
      "mismatched-close",
      "bad-condition-operator",
      "bad-filter-operator",
      "inline-block-helper",
      "unexpected-else",
    ] as const) {
      expect(severityForCode(code)).toBe("blocking");
    }
  });

  it("only warns where the renderer delivers anyway", () => {
    // C-21087: red chip in the editor, renders "" and delivers. Gating on this
    // would block a send the backend accepts.
    expect(severityForCode("condition-arity")).toBe("warning");
  });
});

describe("collectTemplateIssues", () => {
  it("returns nothing for a clean template", () => {
    const content = channel([text("{{#if data.user.isAdmin}}Admin{{else}}Member{{/if}}")]);
    expect(collectTemplateIssues(content)).toEqual([]);
  });

  it("returns nothing for empty or missing content", () => {
    expect(collectTemplateIssues(undefined)).toEqual([]);
    expect(collectTemplateIssues(null)).toEqual([]);
    expect(collectTemplateIssues({ version: "2022-01-01", elements: [] } as never)).toEqual([]);
  });

  it("locates an issue by channel, field and element index", () => {
    const content = channel([text("fine"), text("{{#if data.x}}Admin")]);
    const [issue] = collectTemplateIssues(content);
    expect(issue).toMatchObject({
      severity: "blocking",
      code: "unclosed-block",
      channel: "email",
      field: "content",
      elementIndex: 1,
      raw: "{{#if data.x}}",
      occurrence: 0,
    });
    expect(issue.message).toBeTruthy();
  });

  it("reports nothing for a channel's raw subject, which the send never compiles", () => {
    // This asserted the opposite until the backend was read: a channel override
    // is copied across verbatim, so handlebars in `raw.subject` is delivered as
    // written and cannot fail the send. See the `raw fields` describe below.
    const content = channel([text("fine")], { subject: "{{frobnicate data.score}}" });
    expect(collectTemplateIssues(content)).toEqual([]);
  });

  it("still finds an issue in a meta title, which the send does evaluate", () => {
    // `evaluate-hbs.ts` evaluates `title`, so a broken one fails the send.
    const content = channel([{ type: "meta", title: "{{frobnicate data.score}}" }, text("fine")]);
    const [issue] = collectTemplateIssues(content);
    expect(issue).toMatchObject({ severity: "blocking", code: "unknown-helper", field: "title" });
  });

  it("walks nested elements", () => {
    const content = channel([
      { type: "group", elements: [{ type: "text", content: "Admin{{/if}}" }] },
    ]);
    expect(collectTemplateIssues(content)).toMatchObject([
      { code: "unexpected-close", severity: "blocking", elementIndex: 0 },
    ]);
  });

  it("reports an unseen channel, which is the case a host cannot show", () => {
    const content = {
      version: "2022-01-01",
      elements: [
        { type: "channel", channel: "email", elements: [text("fine")] },
        { type: "channel", channel: "sms", elements: [text("{{#if data.x}}oops")] },
      ],
    } as never;
    expect(collectTemplateIssues(content)).toMatchObject([{ channel: "sms" }]);
  });

  it("numbers repeated issues in one field separately", () => {
    const content = channel([text("{{frobnicate data.a}} and {{frobnicate data.b}}")]);
    const issues = collectTemplateIssues(content);
    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.occurrence)).toEqual([0, 1]);
    expect(issues.map((i) => i.raw)).toEqual(["{{frobnicate data.a}}", "{{frobnicate data.b}}"]);
  });

  it("stays silent on every valid case in the matrix", () => {
    const content = channel(VALID.map((c) => text(c.template)));
    expect(collectTemplateIssues(content)).toEqual([]);
  });

  it("reports every invalid case in the matrix", () => {
    for (const invalid of INVALID) {
      const issues = collectTemplateIssues(channel([text(invalid.template)]));
      expect(issues.length, `${invalid.id} produced no issue`).toBeGreaterThan(0);
    }
  });

  describe("a text block split into string parts, which is what the editor stores", () => {
    const split = (contents: string[]) =>
      channel([
        { type: "text", elements: contents.map((content) => ({ type: "string", content })) },
      ]);

    it("blocks a block split across parts, which the backend compiles one part at a time", () => {
      // Measured: the send fails `Parse error … got 'EOF'` on the first part (F-001).
      const content = split(["{{#if data.a}}", "on", "{{else}}", "off", "{{/if}}"]);
      const issues = collectTemplateIssues(content);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ code: "split-block", severity: "blocking" });
    });

    it("blocks a block split around a link part", () => {
      const content = channel([
        {
          type: "text",
          elements: [
            { type: "string", content: "{{#if data.a}}" },
            { type: "link", content: "go", href: "https://x.com" },
            { type: "string", content: "{{/if}}" },
          ],
        },
      ]);
      expect(collectTemplateIssues(content)).toMatchObject([
        { code: "split-block", severity: "blocking" },
      ]);
    });

    it("stays silent when every part is balanced on its own", () => {
      const content = split(["{{#if data.a}}on{{/if}}", " and ", "{{data.b}}"]);
      expect(collectTemplateIssues(content)).toEqual([]);
    });

    it("still reports a genuinely unclosed block across parts", () => {
      const content = split(["{{#if data.a}}", "on"]);
      expect(collectTemplateIssues(content)).toMatchObject([{ code: "unclosed-block" }]);
    });

    it("still reports a bad helper inside one part", () => {
      const content = split(["{{frobnicate data.a}}", " tail"]);
      expect(collectTemplateIssues(content)).toMatchObject([{ code: "unknown-helper" }]);
    });

    it("does not block the flat shape of the same template", () => {
      const flat = channel([{ type: "text", content: "{{#each data.i}}{{this.n}}{{/each}}" }]);
      expect(collectTemplateIssues(flat)).toEqual([]);
    });
  });
});

// F-008: a locale is sent on its own, so a broken expression only there fails
// every recipient in that locale while the base content looks clean.
describe("collectTemplateIssues — locale overrides", () => {
  it("blocks a broken expression that only exists in a locale, and names it", () => {
    const issues = collectTemplateIssues(
      channel([
        {
          type: "text",
          content: "Hi {{data.name}}",
          locales: { fr: { content: "{{#if data.vip}}cassé" } },
        },
      ])
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "blocking",
      code: "unclosed-block",
      locale: "fr",
      field: "content",
      elementIndex: 0,
    });
    expect(issues[0].message).toContain("fr");
  });

  it("checks a locale's title, href and inline runs", () => {
    const issues = collectTemplateIssues(
      channel([
        { type: "meta", title: "ok", locales: { es: { title: "{{/if}}" } } },
        {
          type: "action",
          content: "Go",
          href: "x",
          locales: { de: { href: "{{frobnicate data.x}}" } },
        },
        {
          type: "text",
          content: "ok",
          locales: { pt: { elements: [{ type: "string", content: "{{#each data.i}}" }] } },
        },
      ])
    );
    expect(issues.map((i) => [i.locale, i.field, i.code])).toEqual([
      ["es", "title", "unexpected-close"],
      ["de", "href", "unknown-helper"],
      ["pt", "content", "unclosed-block"],
    ]);
  });

  it("checks a channel locale's raw fields", () => {
    const doc = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: { html: "<p>{{data.name}}</p>" },
          locales: { fr: { raw: { html: "<p>{{#if data.vip}}</p>" } } },
          elements: [],
        },
      ],
    };
    expect(collectTemplateIssues(doc as never).map((i) => [i.locale, i.field, i.code])).toEqual([
      ["fr", "html", "unclosed-block"],
    ]);
  });

  it("stays quiet for a valid locale", () => {
    expect(
      collectTemplateIssues(
        channel([
          { type: "text", content: "x", locales: { fr: { content: "{{#if data.a}}oui{{/if}}" } } },
        ])
      )
    ).toEqual([]);
  });

  describe("offsets, for locating an issue in the field text", () => {
    it("points at the occurrence that is actually wrong", () => {
      // Two identical openers, only the second unclosed. Locating by `raw`
      // finds the first — the correctly closed one — and marks the wrong line.
      const text = "{{#if data.vip}}a{{/if}} then {{#if data.vip}}b";
      const content = channel([{ type: "text", content: text }]);
      const [issue] = collectTemplateIssues(content);

      expect(issue.code).toBe("unclosed-block");
      expect(issue.start).toBe(text.lastIndexOf("{{#if data.vip}}"));
      expect(text.slice(issue.start, issue.end)).toBe("{{#if data.vip}}");
    });

    it("keeps raw as a fallback for a caller that cannot use offsets", () => {
      const content = channel([{ type: "text", content: "{{frobnicate data.a}}" }]);
      const [issue] = collectTemplateIssues(content);
      expect(issue.raw).toBe("{{frobnicate data.a}}");
      expect(issue.start).toBe(0);
    });
  });
});

/**
 * A channel's `raw.subject` is delivered verbatim. Verified in the backend:
 * `get-channel-overrides.ts` copies `element.raw` across and only transforms
 * `html`, `render-templates.ts` passes a channel override through without
 * compiling it, and `evaluate-hbs.ts` only evaluates `content`, `title`, `href`
 * and `src`. So handlebars there never runs — and flagging it blocked Send test
 * for a template that sends perfectly well.
 */
describe("a channel's raw fields", () => {
  const rawTemplate = (raw: Record<string, string>) => ({
    version: "2022-01-01" as const,
    elements: [{ type: "channel" as const, channel: "email", raw, elements: [] }],
  });

  it("reports nothing for a subject the send never compiles", () => {
    expect(collectTemplateIssues(rawTemplate({ subject: "Hi {{#if data.x}}" }) as never)).toEqual(
      []
    );
  });

  it("reports nothing for raw title or text either", () => {
    expect(collectTemplateIssues(rawTemplate({ title: "{{#if data.x}}" }) as never)).toEqual([]);
    expect(collectTemplateIssues(rawTemplate({ text: "{{/if}}" }) as never)).toEqual([]);
  });

  it("still reports raw html, which the send does interpolate", () => {
    const issues = collectTemplateIssues(rawTemplate({ html: "<p>{{#if data.x}}</p>" }) as never);
    expect(issues.map((issue) => issue.code)).toContain("unclosed-block");
  });
});

/**
 * An element's `if` and a list's `loop` are JavaScript the send runs. Invalid
 * JavaScript raised nothing, so Publish and Send test stayed enabled for a
 * template where every send fails.
 */
describe("an if or loop that will not parse", () => {
  const withElement = (element: Record<string, unknown>) => ({
    version: "2022-01-01" as const,
    elements: [{ type: "channel" as const, channel: "email", elements: [element] }],
  });

  it("blocks on a broken condition", () => {
    const [issue] = collectTemplateIssues(
      withElement({ type: "text", content: "hi", if: "data.vip >" }) as never
    );
    expect(issue).toMatchObject({
      severity: "blocking",
      code: "bad-condition-expression",
      field: "if",
      channel: "email",
      elementIndex: 0,
    });
  });

  it("blocks on a broken loop", () => {
    const [issue] = collectTemplateIssues(
      withElement({ type: "list", loop: "data.items.filter(", elements: [] }) as never
    );
    expect(issue).toMatchObject({ severity: "blocking", code: "bad-loop-expression", field: "loop" });
  });

  it("leaves valid expressions alone", () => {
    expect(
      collectTemplateIssues(
        withElement({ type: "text", content: "hi", if: "data.count > 2" }) as never
      )
    ).toEqual([]);
    expect(
      collectTemplateIssues(withElement({ type: "list", loop: "data.items", elements: [] }) as never)
    ).toEqual([]);
  });

  it("leaves a structured condition object alone, which is not JavaScript", () => {
    expect(
      collectTemplateIssues(
        withElement({ type: "text", content: "hi", if: { operator: "EQUALS" } }) as never
      )
    ).toEqual([]);
  });
});

