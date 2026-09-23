import { describe, expect, it } from "vitest";
import { renderElementalPreview } from "./renderElementalPreview";
import { convertSingleBraceVariables } from "./singleBraceVariables";

// F-005: the send still substitutes legacy `{path}` variables in text content,
// action content and header fields. Outputs measured on a real send with
// data {v: "ok"} (audit run 20260923-145708, FIX-F005-probe).
const probe = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        { type: "meta", title: "S [{data.v}]" },
        { type: "text", content: "P1 [{data.v}]" },
        {
          type: "text",
          elements: [
            { type: "string", content: "P2 [{data.v}]" },
            { type: "string", content: " bold [{data.v}]", bold: true },
          ],
        },
        { type: "action", content: "P3 [{data.v}]", href: "https://x.test/{data.v}" },
        { type: "text", content: "P4 [{data.missing}] [{ data.v }] [{v}]" },
        { type: "text", text_style: "h1", content: "P5 [{data.v}]" },
      ],
    },
  ],
};

describe("single-brace variables in preview", () => {
  const els = () =>
    (
      renderElementalPreview(probe, { data: { v: "ok" } }).content.elements[0] as {
        elements: Record<string, unknown>[];
      }
    ).elements;

  it("substitutes them where the send does", () => {
    const [meta, p1, , p3, p4, p5] = els();
    expect(meta.title).toBe("S [ok]");
    expect(p1.content).toBe("P1 [ok]");
    expect(p3.content).toBe("P3 [ok]");
    expect(p4.content).toBe("P4 [{data.missing}] [[Error]] [ok]");
    expect(p5.content).toBe("P5 [ok]");
  });

  it("leaves string runs and hrefs alone, as the send does", () => {
    const [, , p2, p3] = els();
    expect(p2.elements).toEqual(probe.elements[0].elements[2].elements);
    expect(p3.href).toBe("https://x.test/{data.v}");
  });

  it("does not touch double or triple braces", () => {
    expect(convertSingleBraceVariables("{{data.v}} {{{data.v}}}")).toBe("{{data.v}} {{{data.v}}}");
  });

  it("leaves a {name} inside a helper argument to the helper", () => {
    const text = '{{formatMessage "Hi {name}" name=data.v}} {data.v}';
    expect(convertSingleBraceVariables(text)).toBe(
      '{{formatMessage "Hi {name}" name=data.v}} {{inline-var "data.v"}}'
    );
  });

  it("escapes the path the way the send does", () => {
    expect(convertSingleBraceVariables('{a"b}')).toBe('{{inline-var (parse-string "a\\"b")}}');
    expect(convertSingleBraceVariables("{a\\}")).toBe(
      '{{inline-var (trim-one-char-right (parse-string "a\\\\ "))}}'
    );
  });
});
