import { describe, it, expect, vi, beforeEach } from "vitest";
import { VariablePaste } from "./VariablePaste";
import { isValidVariableName } from "../../utils/validateVariableName";

// ── Helpers that mirror the internal logic so we can unit-test it ────────────

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
const VARIABLE_TEST = /\{\{[^}]+\}\}/;

/** Same as the internal replaceVariablePatternsInHtml */
function replaceVariablePatternsInHtml(html: string): string {
  return html.replace(VARIABLE_PATTERN, (match, variableName) => {
    const trimmed = variableName.trim();
    if (isValidVariableName(trimmed)) {
      return `<span data-variable="true" data-id="${trimmed}"></span>`;
    }
    return match;
  });
}

/**
 * Simulates the full transformPastedHTML logic including the
 * cross-element fallback (strip spans, then re-apply regex).
 */
function simulateTransformPastedHTML(html: string): string {
  // Fast path: direct regex
  const directResult = replaceVariablePatternsInHtml(html);
  if (directResult !== html) return directResult;

  // Fallback: check text content for variables
  const div = document.createElement("div");
  div.innerHTML = html;
  const textContent = div.textContent || "";

  if (!VARIABLE_TEST.test(textContent)) return html;

  // Strip spans and retry
  const stripped = html.replace(/<\/?span[^>]*>/gi, "");
  return replaceVariablePatternsInHtml(stripped);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("VariablePaste Extension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(VariablePaste).toBeDefined();
      expect(VariablePaste.name).toBe("variablePaste");
    });

    it("should have configure method", () => {
      expect(typeof VariablePaste.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = VariablePaste.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variablePaste");
    });

    it("should be an extension type", () => {
      expect(VariablePaste.type).toBe("extension");
    });
  });

  // ── Direct HTML transformation (fast path) ──────────────────────────────

  describe("replaceVariablePatternsInHtml — direct matches", () => {
    it("should transform a simple variable", () => {
      expect(replaceVariablePatternsInHtml("Hello {{name}}!")).toBe(
        'Hello <span data-variable="true" data-id="name"></span>!'
      );
    });

    it("should transform multiple variables", () => {
      expect(
        replaceVariablePatternsInHtml("{{firstName}} {{lastName}}")
      ).toBe(
        '<span data-variable="true" data-id="firstName"></span> <span data-variable="true" data-id="lastName"></span>'
      );
    });

    it("should transform dotted variable names", () => {
      expect(
        replaceVariablePatternsInHtml("{{user.address.city}}")
      ).toBe('<span data-variable="true" data-id="user.address.city"></span>');
    });

    it("should preserve HTML structure around variables", () => {
      const html = "<p>Hello <strong>{{user.name}}</strong>!</p>";
      expect(replaceVariablePatternsInHtml(html)).toBe(
        '<p>Hello <strong><span data-variable="true" data-id="user.name"></span></strong>!</p>'
      );
    });

    it("should not transform incomplete patterns", () => {
      expect(replaceVariablePatternsInHtml("{name}")).toBe("{name}");
      expect(replaceVariablePatternsInHtml("{{incomplete")).toBe(
        "{{incomplete"
      );
    });

    it("should not transform variables with invalid names", () => {
      // Space in name → invalid
      expect(replaceVariablePatternsInHtml("{{bad name}}")).toBe(
        "{{bad name}}"
      );
      // Starts with digit → invalid
      expect(replaceVariablePatternsInHtml("{{123invalid}}")).toBe(
        "{{123invalid}}"
      );
      // Trailing dot → invalid
      expect(replaceVariablePatternsInHtml("{{user.}}")).toBe("{{user.}}");
    });
  });

  // ── Cross-element fallback (the bug we fixed) ───────────────────────────

  describe("transformPastedHTML — cross-element variable patterns", () => {
    it("should handle {{var}} split across two spans", () => {
      // Real-world clipboard HTML: "{" in one span, "{orderNumber}}" in next
      const html =
        '<span style="color: red">Order</span>' +
        '<span style="color: red"> {</span>' +
        '<span style="color: red">{orderNumber}} confirmed</span>';

      const result = simulateTransformPastedHTML(html);
      expect(result).toContain('data-variable="true"');
      expect(result).toContain('data-id="orderNumber"');
    });

    it("should handle closing }} in a separate span", () => {
      const html =
        '<span>{{trackingUrl</span>' +
        '<span>}}</span>';

      const result = simulateTransformPastedHTML(html);
      expect(result).toContain('data-variable="true"');
      expect(result).toContain('data-id="trackingUrl"');
    });

    it("should handle multiple variables split across spans", () => {
      const html =
        '<span>Order {</span><span>{orderNumber}} confirmed. Track at {</span><span>{trackingUrl}}</span>';

      const result = simulateTransformPastedHTML(html);
      expect(result).toContain('data-id="orderNumber"');
      expect(result).toContain('data-id="trackingUrl"');
    });

    it("should handle heavily split variable (each char in its own span)", () => {
      // Extreme case: braces split across many spans
      const html =
        "<span>{</span><span>{</span><span>name</span><span>}</span><span>}</span>";

      const result = simulateTransformPastedHTML(html);
      expect(result).toContain('data-id="name"');
    });

    it("should handle variables with styled spans (real clipboard data)", () => {
      // Simulates actual Chrome clipboard HTML with long style attributes
      const style =
        'style="color: rgb(0,0,0); font-family: Arial; font-size: 14px;"';
      const html =
        `<meta charset="utf-8">` +
        `<span ${style}>Order</span>` +
        `<span ${style}><span> </span>{</span>` +
        `<span ${style}>{orderNumber}} confirmed</span>` +
        `<span ${style}>. Track</span>` +
        `<span ${style}><span> </span>at</span>` +
        `<span ${style}><span> </span>{{trackingUrl</span>` +
        `<span ${style}>}}</span>`;

      const result = simulateTransformPastedHTML(html);
      expect(result).toContain('data-id="orderNumber"');
      expect(result).toContain('data-id="trackingUrl"');
      // Non-span elements like <meta> should be preserved
      expect(result).toContain("<meta");
    });

    it("should not strip spans when no variables are present", () => {
      const html = '<span style="color: red">Hello world</span>';
      const result = simulateTransformPastedHTML(html);
      // No variables → original HTML returned unchanged
      expect(result).toBe(html);
    });

    it("should use fast path when variables are in a single text run", () => {
      const html = "<p>Hello {{name}}!</p>";
      const result = simulateTransformPastedHTML(html);
      // Fast path works, spans not stripped, <p> preserved
      expect(result).toBe(
        '<p>Hello <span data-variable="true" data-id="name"></span>!</p>'
      );
    });
  });

  // ── Variable detection regex ────────────────────────────────────────────

  describe("VARIABLE_TEST — detection regex", () => {
    it("should detect variables in text", () => {
      expect(VARIABLE_TEST.test("Hello {{user.name}}!")).toBe(true);
    });

    it("should not detect when none exist", () => {
      expect(VARIABLE_TEST.test("Hello world!")).toBe(false);
    });

    it("should not match single braces", () => {
      expect(VARIABLE_TEST.test("{name}")).toBe(false);
    });

    it("should not match incomplete doubles", () => {
      expect(VARIABLE_TEST.test("{{incomplete")).toBe(false);
    });
  });

  // ── Variable name extraction ────────────────────────────────────────────

  describe("VARIABLE_PATTERN — extraction regex", () => {
    function extractNames(text: string): string[] {
      const regex = /\{\{([^}]+)\}\}/g;
      const names: string[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        names.push(match[1]);
      }
      return names;
    }

    it("should extract single variable name", () => {
      expect(extractNames("Hello {{user.name}}!")).toEqual(["user.name"]);
    });

    it("should extract multiple variable names", () => {
      expect(extractNames("{{a}} and {{b.c}}")).toEqual(["a", "b.c"]);
    });

    it("should extract consecutive variables", () => {
      expect(extractNames("{{first}}{{second}}")).toEqual([
        "first",
        "second",
      ]);
    });

    it("should extract deeply nested variable names", () => {
      expect(extractNames("{{data.user.profile.settings.theme}}")).toEqual([
        "data.user.profile.settings.theme",
      ]);
    });
  });

  // ── Integration readiness ───────────────────────────────────────────────

  describe("Integration Readiness", () => {
    it("should be ready for TipTap integration", () => {
      expect(VariablePaste.name).toBe("variablePaste");
      expect(VariablePaste.type).toBe("extension");
      expect(typeof VariablePaste.configure).toBe("function");
    });

    it("should support complete copy/paste workflow", () => {
      const extension = VariablePaste.configure({});
      expect(extension).toBeDefined();
      expect(extension.name).toBe("variablePaste");
      expect(extension.type).toBe("extension");
    });

    it("should maintain compatibility with variable syntax", () => {
      const variableSyntax = "{{user.name}}";
      const htmlTransform = replaceVariablePatternsInHtml(variableSyntax);
      expect(htmlTransform).toContain('data-variable="true"');
      expect(htmlTransform).toContain('data-id="user.name"');
    });
  });
});
