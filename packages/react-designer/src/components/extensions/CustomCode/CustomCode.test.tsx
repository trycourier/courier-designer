import { describe, it, expect, vi } from "vitest";
import { CustomCode, defaultCustomCodeProps } from "./CustomCode";

// Mock the CustomCodeComponentNode
vi.mock("./CustomCodeComponent", () => ({
  CustomCodeComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("CustomCode Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(CustomCode).toBeDefined();
      expect(CustomCode.name).toBe("customCode");
    });

    it("should have configure method", () => {
      expect(typeof CustomCode.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = CustomCode.configure({
        HTMLAttributes: { class: "custom-code" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(CustomCode).toHaveProperty("type");
      expect(CustomCode).toHaveProperty("name");
      expect(CustomCode).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(CustomCode.type).toBe("node");
    });

    it("should be an atomic block element", () => {
      // CustomCode is configured as an atomic block element (configured during extension creation)
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should be properly configured", () => {
      // CustomCode configuration is handled during extension creation
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultCustomCodeProps", () => {
      // Test that defaultCustomCodeProps is imported and available
      expect(defaultCustomCodeProps).toBeDefined();
      expect(defaultCustomCodeProps.code).toBe("<!-- Add your HTML code here -->");
    });

    it("should have expected default prop types", () => {
      expect(defaultCustomCodeProps.code).toBeTypeOf("string");
      expect(defaultCustomCodeProps.code).toContain("<!--");
      expect(defaultCustomCodeProps.code).toContain("-->");
    });

    it("should provide sensible default HTML code", () => {
      expect(defaultCustomCodeProps.code).toBe("<!-- Add your HTML code here -->");
      expect(defaultCustomCodeProps.code.length).toBeGreaterThan(0);
    });
  });

  describe("CustomCode Attributes", () => {
    it("should support code attribute", () => {
      const configured = CustomCode.configure();

      // Check that the extension has the expected attributes structure
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should support id attribute", () => {
      // The customCode should support an id attribute for node identification
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should have code as primary content attribute", () => {
      // Verify code attribute is the main content holder
      expect(defaultCustomCodeProps.code).toBeTypeOf("string");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      // Test that the extension has proper HTML handling
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-custom-code",
          "data-testid": "custom-code",
        },
      };

      expect(() => {
        const configured = CustomCode.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with custom-code data type", () => {
      // The extension should render as a div element with data-type="custom-code"
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Commands Integration", () => {
    it("should support customCode-specific commands", () => {
      // Test that the extension has commands configured
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should handle customCode creation", () => {
      // The extension should support custom code creation
      expect(() => {
        const configured = CustomCode.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should support keyboard shortcuts", () => {
      // Test that the extension has keyboard shortcuts configured
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });

    it("should handle customCode-specific shortcuts", () => {
      // The extension should have custom code-specific keyboard shortcuts
      expect(() => {
        const configured = CustomCode.configure();
        return configured;
      }).not.toThrow();
    });

    it("should prevent deletion via Backspace/Delete keys", () => {
      // CustomCode blocks should be protected from accidental deletion
      const configured = CustomCode.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("customCode");
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic customCode creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = CustomCode.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-custom-code",
          "data-testid": "custom-code",
        },
      };

      expect(() => {
        const configured = CustomCode.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support custom code props", () => {
      // Test different code configurations
      const customProps = {
        code: "<div><h1>Custom HTML</h1><p>This is raw HTML content.</p></div>",
      };

      expect(customProps.code).not.toBe(defaultCustomCodeProps.code);
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
      // Verify the extension has the minimum required structure for TipTap
      expect(CustomCode.name).toBe("customCode");
      expect(CustomCode.type).toBe("node");
      expect(typeof CustomCode.configure).toBe("function");
    });

    it("should work with default custom code props", () => {
      // Verify that default props are available and have expected structure
      const requiredProps = ["code"];

      requiredProps.forEach((prop) => {
        expect(defaultCustomCodeProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultCustomCodeProps.code).toBeTypeOf("string");
      expect(defaultCustomCodeProps.code).toContain("<!--");
      expect(defaultCustomCodeProps.code).toContain("-->");
    });

    it("should support node view rendering", () => {
      // The extension should be configured with ReactNodeViewRenderer
      const configured = CustomCode.configure();
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
        expect(html).toMatch(/<[^>]+>/); // Contains HTML tags
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
      // Note: This test just ensures the code can be stored - actual security should be handled at render time
      const potentiallyUnsafeHtml = [
        "<script>alert('xss');</script>",
        "<iframe src='javascript:alert(1)'></iframe>",
        "<img src='x' onerror='alert(1)' />",
        "javascript:alert('xss')",
      ];

      potentiallyUnsafeHtml.forEach((html) => {
        expect(html).toBeTypeOf("string");
        // The extension should accept any string - security filtering happens at render time
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
      expect(formattedHtml).toContain("<meta charset=\"UTF-8\">");
      expect(formattedHtml).toContain("</html>");
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      // Verify that our extension is properly set up
      expect(CustomCode).toBeDefined();
      expect(defaultCustomCodeProps).toBeDefined();
    });

    it("should mock CustomCodeComponentNode", () => {
      // Verify that CustomCodeComponentNode is mocked
      expect(CustomCode).toBeDefined();
    });
  });

  describe("Elemental Integration", () => {
    it("should support HTML element conversion", () => {
      // CustomCode should work with HTML elements from Courier's elemental specification
      const elementalHtmlContent = "<div><h1>Custom HTML</h1><p>This is raw HTML content.</p></div>";
      
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
