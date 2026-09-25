import { beforeEach, describe, expect, it } from "vitest";
import { renderElementalPreview } from "./renderElementalPreview";
import { renderHandlebarsPreview, resetPreviewEnv } from "./renderPreview";

const FLOAT = '{{#if (condition data.foo "==" "bar")}}This is bar!{{else}}This is not bar{{/if}}';

describe("renderHandlebarsPreview", () => {
  beforeEach(() => resetPreviewEnv());

  it("renders the matching branch of the Float subject", () => {
    expect(renderHandlebarsPreview(FLOAT, { data: { foo: "bar" } }).text).toBe("This is bar!");
  });

  it("renders the else branch when the condition fails", () => {
    expect(renderHandlebarsPreview(FLOAT, { data: { foo: "qux" } }).text).toBe("This is not bar");
  });

  it("substitutes a plain variable", () => {
    expect(renderHandlebarsPreview("Hi {{data.name}}!", { data: { name: "Ada" } }).text).toBe(
      "Hi Ada!"
    );
  });

  it("leaves text without handlebars untouched", () => {
    expect(renderHandlebarsPreview("plain", {}).text).toBe("plain");
  });

  it("does not HTML-escape values, which the editor renders as text", () => {
    expect(renderHandlebarsPreview("{{data.x}}", { data: { x: "a & b" } }).text).toBe("a & b");
  });

  it("returns the original text rather than destroying it when compilation fails", () => {
    const broken = "{{#if data.x}}unclosed";
    const result = renderHandlebarsPreview(broken, {});
    expect(result.ok).toBe(false);
    expect(result.text).toBe(broken);
    expect(result.error).toBeTruthy();
  });

  describe("helpers mirrored from the renderer", () => {
    const cases: [string, Record<string, unknown>, string][] = [
      ['{{default data.missing "fallback"}}', {}, "fallback"],
      ["{{capitalize data.x}}", { data: { x: "ada" } }, "Ada"],
      ['{{truncate data.x 3 "…"}}', { data: { x: "abcdef" } }, "abc…"],
      ["{{add 2 3}}", {}, "5"],
      ["{{subtract 5 3}}", {}, "2"],
      ["{{multiply 4 3}}", {}, "12"],
      ["{{round 2.6}}", {}, "3"],
      ["{{inc 4}}", {}, "5"],
      ['{{#if (condition 2 ">" 1)}}yes{{else}}no{{/if}}', {}, "yes"],
      ['{{#if (condition 1 ">" 2)}}yes{{else}}no{{/if}}', {}, "no"],
      ["{{#if (and data.a data.b)}}both{{/if}}", { data: { a: 1, b: 1 } }, "both"],
      ["{{#if (or data.a data.b)}}either{{/if}}", { data: { a: 0, b: 1 } }, "either"],
      ["{{#if (not data.a)}}none{{/if}}", { data: { a: false } }, "none"],
      ["{{#each data.items}}{{this}};{{/each}}", { data: { items: ["a", "b"] } }, "a;b;"],
    ];

    it.each(cases)("renders %s", (template, data, expected) => {
      expect(renderHandlebarsPreview(template, data).text).toBe(expected);
    });
  });

  describe("control flow the test matrix leans on", () => {
    it("walks an else-if chain", () => {
      const t =
        '{{#if (condition data.n "==" 1)}}one{{else if (condition data.n "==" 2)}}two{{else}}many{{/if}}';
      expect(renderHandlebarsPreview(t, { data: { n: 1 } }).text).toBe("one");
      expect(renderHandlebarsPreview(t, { data: { n: 2 } }).text).toBe("two");
      expect(renderHandlebarsPreview(t, { data: { n: 9 } }).text).toBe("many");
    });

    it("exposes @index and @last inside each", () => {
      expect(
        renderHandlebarsPreview(
          "{{#each data.items}}{{@index}}:{{this.name}}{{#unless @last}},{{/unless}}{{/each}}",
          { data: { items: [{ name: "a" }, { name: "b" }] } }
        ).text
      ).toBe("0:a,1:b");
    });

    it("nests sub-expressions two deep", () => {
      expect(
        renderHandlebarsPreview(
          '{{#if (and (condition data.a "==" 1) (not data.b))}}yes{{else}}no{{/if}}',
          {
            data: { a: 1, b: false },
          }
        ).text
      ).toBe("yes");
    });

    it("renders an inverse section", () => {
      expect(
        renderHandlebarsPreview("{{^data.empty}}none{{/data.empty}}", { data: { empty: false } })
          .text
      ).toBe("none");
    });

    it("keeps a triple-stache unescaped and drops a comment", () => {
      expect(
        renderHandlebarsPreview("{{{data.html}}}{{! hidden }}", { data: { html: "<b>x</b>" } }).text
      ).toBe("<b>x</b>");
    });

    it("honours concat's hash options", () => {
      expect(
        renderHandlebarsPreview('{{concat data.a data.b separator="-"}}', {
          data: { a: "x", b: "y" },
        }).text
      ).toBe("x-y");
    });

    it("reports a divide by zero rather than crashing", () => {
      expect(renderHandlebarsPreview("{{divide 1 0}}", {}).ok).toBe(false);
    });
  });

  it("reports helpers whose preview cannot match send time", () => {
    const result = renderHandlebarsPreview('{{t "greeting"}}', {});
    expect(result.approximated).toContain("t");
  });
});

describe("renderElementalPreview", () => {
  beforeEach(() => resetPreviewEnv());

  it("renders the subject and body of an elemental tree", () => {
    const content = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            { type: "meta", title: FLOAT },
            { type: "text", content: "Hello {{data.name}}" },
          ],
        },
      ],
    };

    const result = renderElementalPreview(content, { data: { foo: "bar", name: "Ada" } });
    const channel = result.content.elements[0] as { elements: Record<string, string>[] };
    expect(channel.elements[0].title).toBe("This is bar!");
    expect(channel.elements[1].content).toBe("Hello Ada");
  });

  it("leaves structural fields alone", () => {
    const content = { elements: [{ type: "text", content: "x", background_color: "#fff" }] };
    const result = renderElementalPreview(content, {});
    expect((result.content.elements[0] as Record<string, string>).background_color).toBe("#fff");
  });

  it("joins a text block's string parts so a block spanning them picks one branch", () => {
    // The editor splits a text block into one `string` part per formatting
    // change, so `{{#if}}`, its body and `{{/if}}` land in separate parts.
    const content = {
      elements: [
        {
          type: "text",
          elements: [
            { type: "string", content: "Hello {{data.name}}, " },
            { type: "string", content: "{{#if data.vip}}" },
            { type: "string", content: "you are a VIP" },
            { type: "string", content: "{{else}}welcome{{/if}}" },
          ],
        },
      ],
    };

    const result = renderElementalPreview(content, { data: { name: "Ada", vip: true } });
    const parts = (result.content.elements[0] as { elements: { content: string }[] }).elements;
    expect(parts.map((p) => p.content).join("")).toBe("Hello Ada, you are a VIP");
  });

  it("takes the else branch across joined parts", () => {
    const content = {
      elements: [
        {
          type: "text",
          elements: [
            { type: "string", content: "{{#if data.vip}}" },
            { type: "string", content: "VIP{{else}}plain{{/if}}" },
          ],
        },
      ],
    };

    const result = renderElementalPreview(content, { data: { vip: false } });
    const parts = (result.content.elements[0] as { elements: { content: string }[] }).elements;
    expect(parts.map((p) => p.content).join("")).toBe("plain");
  });

  it("keeps self-contained parts separate, so their formatting survives", () => {
    const content = {
      elements: [
        {
          type: "text",
          elements: [
            { type: "string", content: "Hi {{data.name}}", bold: true },
            { type: "string", content: " and {{data.other}}" },
          ],
        },
      ],
    };

    const result = renderElementalPreview(content, { data: { name: "Ada", other: "Bob" } });
    const parts = (result.content.elements[0] as { elements: Record<string, unknown>[] }).elements;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ content: "Hi Ada", bold: true });
    expect(parts[1]).toMatchObject({ content: " and Bob" });
  });

  it("does not mutate the input", () => {
    const content = { elements: [{ type: "text", content: "Hi {{data.n}}" }] };
    renderElementalPreview(content, { data: { n: "Ada" } });
    expect(content.elements[0].content).toBe("Hi {{data.n}}");
  });

  it("refuses an unterminated mustache, as the send does", () => {
    // `collectTemplateIssues` calls this blocking and the backend returns
    // `Parse error ... Expecting 'ID', got 'INVALID'`. Reporting it renderable
    // gave hosts two opposite answers about one template.
    const result = renderHandlebarsPreview("Hi {{data.user.firstName", {});
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("still passes through text with no handlebars at all", () => {
    expect(renderHandlebarsPreview("just words", {})).toMatchObject({
      ok: true,
      text: "just words",
    });
  });
});
