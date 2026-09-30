import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import { collectTemplateIssues, severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

/**
 * The renderer compiles each field, so whatever `Handlebars.parse` rejects
 * fails the send outright. These all delivered nothing on dev (audit run
 * 20260928) while the editor reported nothing.
 */
const REJECTED: [string, string][] = [
  ["D05 bracket indexing", "[{{data.d.items[0].name}}]"],
  ["D43 a reserved word as a segment", "[{{data.d.true}}]"],
  ["S46b a second else", "{{#if data.s.t}}a{{else}}b{{else}}c{{/if}}"],
  ["S49 a stray closing brace", "[{{data.s.name}}}]"],
  ["S50a an empty expression", "[{{}}]"],
  ["S50b an unclosed sub-expression", "[{{capitalize (trim data.s.name}}]"],
];

describe("a field the compiler rejects", () => {
  it.each(REJECTED)("%s blocks", (_label, text) => {
    const issue = validateHandlebars(text).find((i) => i.code === "parse-error");
    expect(issue, text).toBeDefined();
    expect(severityOfIssue(issue!)).toBe("blocking");
    expect(issue!.message).toMatch(/Handlebars cannot compile this field: \S/);
  });

  it("reports a trailing dot the parser accepts", () => {
    const [issue] = validateHandlebars("[{{data.d.}}]");
    expect(issue).toMatchObject({ code: "trailing-dot", severity: "error" });
    expect(severityOfIssue(issue)).toBe("blocking");
  });

  it("prefers the friendlier rule and does not list both", () => {
    const codes = validateHandlebars("{{#if data.x}}unclosed").map((i) => i.code);
    expect(codes).toContain("unclosed-block");
    expect(codes).not.toContain("parse-error");
  });

  it("leaves a field the compiler accepts alone", () => {
    for (const text of [
      "{{#if data.s.t}}a{{else}}b{{/if}}",
      "[{{data.d.list.[0]}}]",
      "[{{data.d.[my key]}}]",
      '{{#*inline "p"}}INL{{/inline}}{{> p}}',
      "{{#each data.items as |item i|}}{{i}}{{item.name}}{{/each}}",
    ]) {
      expect(validateHandlebars(text), text).toEqual([]);
    }
  });

  it("does not judge a lone occurrence by the parser", () => {
    // Every per-occurrence call site strips the field-wide codes; without that
    // exclusion a valid conditional's own `{{else}}` would go red.
    expect(validateHandlebars("{{else}}").map((i) => i.code)).not.toContain("parse-error");
  });
});

/**
 * An issue with no snippet is a list row the author cannot read or locate, and
 * several identical rows cannot be told apart.
 */
describe("what the issue list can show", () => {
  const raws = (text: string) =>
    collectTemplateIssues({
      version: "2022-01-01",
      elements: [
        { type: "channel", channel: "email", elements: [{ type: "text", content: text }] },
      ],
    } as unknown as ElementalContent).map((issue) => issue.raw);

  it("points a parse failure at the occurrence that fails on its own", () => {
    expect(raws("D05 [{{data.d.items[0].name}}]")).toEqual(["{{data.d.items[0].name}}"]);
    expect(raws("D43 [{{data.d.true}}]")).toEqual(["{{data.d.true}}"]);
    expect(raws("S50a [{{}}]")).toEqual(["{{}}"]);
    expect(raws("S50b [{{capitalize (trim data.s.name}}]")).toEqual([
      "{{capitalize (trim data.s.name}}",
    ]);
  });

  it("falls back to the parser's own excerpt when no one occurrence fails", () => {
    const [raw] = raws("S49 [{{data.s.name}}}]");
    expect(raw).toBeTruthy();
    expect(raw).toContain("data.s.name");
  });

  it("does not blame the first block marker for a later mistake", () => {
    const [raw] = raws("S46b {{#if data.s.t}}a{{else}}b{{else}}c{{/if}}");
    expect(raw).not.toBe("{{else}}");
  });

  it("shows an unclosed opener with the text that follows it", () => {
    const [raw] = raws("S47 [{{data.s.name]");
    expect(raw).toBe("{{data.s.name]");
  });

  it("names the closer the opener actually needs", () => {
    const issue = validateHandlebars("[{{{data.s.name}}]").find((i) => i.code === "unterminated");
    expect(issue!.message).toContain("`}}}`");
    expect(issue!.raw).toBe("{{{data.s.name}}]");
  });
});
