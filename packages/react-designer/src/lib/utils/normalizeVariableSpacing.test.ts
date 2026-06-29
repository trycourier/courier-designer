import { describe, it, expect } from "vitest";
import { normalizeVariableSpacing } from "./normalizeVariableSpacing";

describe("normalizeVariableSpacing", () => {
  describe("liquid", () => {
    it("adds inner spaces to variable tokens", () => {
      expect(normalizeVariableSpacing("Hello {{data.name}}", "liquid")).toBe(
        "Hello {{ data.name }}"
      );
    });

    it("normalizes existing/irregular spacing", () => {
      expect(normalizeVariableSpacing("{{  data.name  }}", "liquid")).toBe("{{ data.name }}");
      expect(normalizeVariableSpacing("{{ data.name}}", "liquid")).toBe("{{ data.name }}");
    });

    it("preserves filters while spacing the token", () => {
      expect(normalizeVariableSpacing("{{data.name | upcase}}", "liquid")).toBe(
        "{{ data.name | upcase }}"
      );
    });

    it("handles multiple tokens in one string", () => {
      expect(normalizeVariableSpacing("{{data.a}} and {{data.b}}", "liquid")).toBe(
        "{{ data.a }} and {{ data.b }}"
      );
    });

    it("normalizes {% %} tag spacing", () => {
      expect(normalizeVariableSpacing("{%if data.vip%}", "liquid")).toBe("{% if data.vip %}");
      expect(normalizeVariableSpacing("{%  endif  %}", "liquid")).toBe("{% endif %}");
    });

    it("handles mixed {{ }} and {% %} tokens", () => {
      expect(normalizeVariableSpacing("{%if data.vip%}{{data.name}}", "liquid")).toBe(
        "{% if data.vip %}{{ data.name }}"
      );
    });

    it("does not truncate a tag whose quoted arg contains %}", () => {
      // The inner '%}' must be treated as a string literal, not the tag close.
      expect(normalizeVariableSpacing("{%assign x = data.s | split: '%}'%}", "liquid")).toBe(
        "{% assign x = data.s | split: '%}' %}"
      );
    });
  });

  describe("handlebars (no-op)", () => {
    it("leaves spaced variable tokens untouched (no unsolicited mutation)", () => {
      expect(normalizeVariableSpacing("Hello {{ data.name }}", "handlebars")).toBe(
        "Hello {{ data.name }}"
      );
    });

    it("leaves tight tokens unchanged", () => {
      expect(normalizeVariableSpacing("{{data.name}}", "handlebars")).toBe("{{data.name}}");
    });

    it("does not touch triple-stache raw output", () => {
      expect(normalizeVariableSpacing("{{{ rawHtml }}}", "handlebars")).toBe("{{{ rawHtml }}}");
    });

    it("leaves {% %} tags untouched", () => {
      expect(normalizeVariableSpacing("{% if x %}", "handlebars")).toBe("{% if x %}");
    });
  });

  it("recurses through nested elemental content", () => {
    const content = {
      version: "2022-01-01" as const,
      elements: [
        {
          type: "text",
          content: "Hi {{data.first}}",
          elements: [{ type: "string", content: "{{data.nested}}" }],
        },
      ],
    };

    const result = normalizeVariableSpacing(content, "liquid");

    expect(result.elements[0].content).toBe("Hi {{ data.first }}");
    // @ts-expect-error nested test shape
    expect(result.elements[0].elements[0].content).toBe("{{ data.nested }}");
    // Does not mutate the input.
    expect(content.elements[0].content).toBe("Hi {{data.first}}");
  });

  it("leaves strings without variables untouched", () => {
    expect(normalizeVariableSpacing("#ffffff", "liquid")).toBe("#ffffff");
    expect(normalizeVariableSpacing("plain text", "liquid")).toBe("plain text");
  });
});
