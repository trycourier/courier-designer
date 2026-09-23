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

  it("finds an issue in a channel's subject, which compiles like the body", () => {
    const content = channel([text("fine")], { subject: "{{frobnicate data.score}}" });
    const [issue] = collectTemplateIssues(content);
    expect(issue).toMatchObject({
      severity: "blocking",
      code: "unknown-helper",
      channel: "email",
      field: "subject",
    });
    expect(issue.elementIndex).toBeUndefined();
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
});
