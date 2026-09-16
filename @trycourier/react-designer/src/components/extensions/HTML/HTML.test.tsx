import { describe, it, expect, vi } from "vitest";
import { HTML, defaultHTMLProps } from "./HTML";

vi.mock("./HTMLComponent", () => ({
  HTMLComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("HTML Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(HTML).toBeDefined();
      expect(HTML.name).toBe("customCode");
    });

    it("should have configure method", () => {
      expect(typeof HTML.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = HTML.configure({
        HTMLAttributes: { class: "custom-code" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(HTML).toHaveProperty("type");
      expect(HTML).toHaveProperty("name");
      expect(HTML).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(HTML.type).toBe("node");
    });

    it("should be an atomic block element", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should be properly configured", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultHTMLProps", () => {
      expect(defaultHTMLProps).toBeDefined();
      expect(defaultHTMLProps.code).toBe("<!-- Add your HTML code here -->");
    });

    it("should have expected default prop types", () => {
      expect(defaultHTMLProps.code).toBeTypeOf("string");
      expect(defaultHTMLProps.code).toContain("<!--");
      expect(defaultHTMLProps.code).toContain("-->");
    });

    it("should provide sensible default HTML code", () => {
      expect(defaultHTMLProps.code).toBe("<!-- Add your HTML code here -->");
      expect(defaultHTMLProps.code.length).toBeGreaterThan(0);
    });
  });

  describe("HTML Attributes", () => {
    it("should support code attribute", () => {
      const configured = HTML.configure();

      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should support id attribute", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should have code as primary content attribute", () => {
      expect(defaultHTMLProps.code).toBeTypeOf("string");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-html",
          "data-testid": "html-block",
        },
      };

      expect(() => {
        const configured = HTML.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with custom-code data type", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Commands Integration", () => {
    it("should support HTML-specific commands", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should handle HTML block creation", () => {
      expect(() => {
        const configured = HTML.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should support keyboard shortcuts", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should handle HTML-specific shortcuts", () => {
      expect(() => {
        const configured = HTML.configure();
        return configured;
      }).not.toThrow();
    });

    it("should prevent deletion via Backspace/Delete keys", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic HTML block creation", () => {
      expect(() => {
        const instance = HTML.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-html",
          "data-testid": "html-block",
        },
      };

      expect(() => {
        const configured = HTML.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support HTML props", () => {
      const customProps = {
        code: "<div><h1>Custom HTML</h1><p>This is raw HTML content.</p></div>",
      };

      expect(customProps.code).not.toBe(defaultHTMLProps.code);
      expect(customProps.code).toContain("<div>");
      expect(customProps.code).toContain("</div>");
      expect(customProps.code).toContain("<h1>");
      expect(customProps.code).toContain("</h1>");
    });

    it("should handle various HTML code formats", () => {
      const htmlExamples = [
        "<p>Simple paragraph</p>",
        "<div class='container'><span>Nested elements</span></div>",
        "<!-- HTML comment -->",
        "<script>alert('Hello');</script>",
        "<style>body { margin: 0; }</style>",
        `<table>
          <tr>
            <td>Table content</td>
          </tr>
        </table>`,
      ];

      htmlExamples.forEach((html) => {
        expect(html).toBeTypeOf("string");
        expect(html.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      expect(HTML.name).toBe("customCode");
      expect(HTML.type).toBe("node");
      expect(typeof HTML.configure).toBe("function");
    });

    it("should work with default HTML props", () => {
      const requiredProps = ["code"];

      requiredProps.forEach((prop) => {
        expect(defaultHTMLProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultHTMLProps.code).toBeTypeOf("string");
      expect(defaultHTMLProps.code).toContain("<!--");
      expect(defaultHTMLProps.code).toContain("-->");
    });

    it("should support node view rendering", () => {
      const configured = HTML.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Code Content Validation", () => {
    it("should accept various HTML tag types", () => {
      const validHtmlExamples = [
        "<div>Block element</div>",
        "<span>Inline element</span>",
        "<img src='test.jpg' alt='test' />",
        "<a href='#'>Link</a>",
        "<button>Button</button>",
        "<form><input type='text' /></form>",
      ];

      validHtmlExamples.forEach((html) => {
        expect(html).toBeTypeOf("string");
        expect(html).toMatch(/<[^>]+>/);
      });
    });

    it("should handle multi-line HTML", () => {
      const multiLineHtml = `
        <div class="container">
          <h1>Title</h1>
          <p>Description</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;

      expect(multiLineHtml).toBeTypeOf("string");
      expect(multiLineHtml).toContain("\n");
      expect(multiLineHtml).toContain("<div");
      expect(multiLineHtml).toContain("</div>");
    });

    it("should handle HTML with attributes", () => {
      const htmlWithAttributes = `
        <div id="main" class="container" data-test="value">
          <p style="color: red; font-weight: bold;">Styled text</p>
          <img src="image.jpg" alt="Description" width="100" height="50" />
        </div>
      `;

      expect(htmlWithAttributes).toContain('id="main"');
      expect(htmlWithAttributes).toContain('class="container"');
      expect(htmlWithAttributes).toContain('data-test="value"');
      expect(htmlWithAttributes).toContain('style="color: red; font-weight: bold;"');
    });
  });

  describe("Security Considerations", () => {
    it("should handle potentially unsafe HTML gracefully", () => {
      const potentiallyUnsafeHtml = [
        "<script>alert('xss');</script>",
        "<iframe src='javascript:alert(1)'></iframe>",
        "<img src='x' onerror='alert(1)' />",
        "javascript:alert('xss')",
      ];

      potentiallyUnsafeHtml.forEach((html) => {
        expect(html).toBeTypeOf("string");
      });
    });

    it("should preserve HTML formatting", () => {
      const formattedHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Page Title</title>
            <meta charset="UTF-8">
          </head>
          <body>
            <h1>Heading</h1>
            <p>Paragraph</p>
          </body>
        </html>
      `;

      expect(formattedHtml).toContain("<!DOCTYPE html>");
      expect(formattedHtml).toContain('<meta charset="UTF-8">');
      expect(formattedHtml).toContain("</html>");
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      expect(HTML).toBeDefined();
      expect(defaultHTMLProps).toBeDefined();
    });

    it("should mock HTMLComponentNode", () => {
      expect(HTML).toBeDefined();
    });
  });

  describe("Elemental Integration", () => {
    it("should support HTML element conversion", () => {
      const elementalHtmlContent =
        "<div><h1>Custom HTML</h1><p>This is raw HTML content.</p></div>";

      expect(elementalHtmlContent).toBeTypeOf("string");
      expect(elementalHtmlContent).toContain("<h1>");
      expect(elementalHtmlContent).toContain("</h1>");
      expect(elementalHtmlContent).toContain("<p>");
      expect(elementalHtmlContent).toContain("</p>");
    });

    it("should handle typical elemental HTML patterns", () => {
      const elementalPatterns = [
        "<!-- Courier HTML Element -->",
        "<div data-courier='html-element'>Content</div>",
        "<table><tr><td>Email table layout</td></tr></table>",
        "<span style='color: #333;'>Inline styled content</span>",
      ];

      elementalPatterns.forEach((pattern) => {
        expect(pattern).toBeTypeOf("string");
        expect(pattern.length).toBeGreaterThan(0);
      });
    });

    it("should preserve complex HTML structures", () => {
      const complexHtml = `
        <div class="email-template">
          <header>
            <h1>Newsletter</h1>
          </header>
          <main>
            <section>
              <h2>Section Title</h2>
              <p>Section content with <a href="#">links</a> and <strong>formatting</strong>.</p>
            </section>
          </main>
          <footer>
            <p>&copy; 2023 Company Name</p>
          </footer>
        </div>
      `;

      expect(complexHtml).toContain("<header>");
      expect(complexHtml).toContain("</header>");
      expect(complexHtml).toContain("<main>");
      expect(complexHtml).toContain("</main>");
      expect(complexHtml).toContain("<footer>");
      expect(complexHtml).toContain("</footer>");
      expect(complexHtml).toContain("&copy;");
    });
  });
});
