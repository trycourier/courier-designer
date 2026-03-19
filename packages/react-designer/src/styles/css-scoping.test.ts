import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * CSS Scoping Tests
 *
 * Verifies that the editor's CSS doesn't leak global styles into host
 * applications, and that host-app styles don't leak into editor content.
 *
 * Background: The editor ships Tailwind CSS with a Preflight (CSS reset).
 * Without proper scoping, these global resets (*, html, body, h1-h6, button,
 * etc.) override the host application's styles when the stylesheet is imported.
 *
 * The fix has two layers:
 * 1. Outbound: `:where(.theme-container)` scoping with zero specificity
 * 2. Inbound: `:where(.theme-container) .ProseMirror` scoping with `all: revert`
 *
 * Import order matters: scoped-preflight.css must be imported BEFORE
 * editor.css so that editor typography rules (same specificity) win.
 */

const rootDir = path.resolve(__dirname, "..");
const readFile = (relativePath: string) =>
  fs.readFileSync(path.resolve(rootDir, relativePath), "utf-8");

describe("CSS Scoping — Outbound Isolation", () => {
  describe("Tailwind config", () => {
    it("should have Preflight disabled", () => {
      const config = readFile("../tailwind.config.js");
      expect(config).toContain("preflight: false");
    });

    it("should use courier- prefix for utility classes", () => {
      const config = readFile("../tailwind.config.js");
      expect(config).toContain("prefix: 'courier-'");
    });
  });

  describe("styles.css entry point", () => {
    const styles = readFile("styles.css");

    it("should import the scoped preflight", () => {
      expect(styles).toContain('@import "./scoped-preflight.css"');
    });

    it("should import scoped-preflight BEFORE editor.css so editor styles cascade last", () => {
      const preflightIdx = styles.indexOf('@import "./scoped-preflight.css"');
      const editorIdx = styles.indexOf('@import "./components/editor.css"');
      expect(preflightIdx).toBeGreaterThanOrEqual(0);
      expect(editorIdx).toBeGreaterThanOrEqual(0);
      expect(preflightIdx).toBeLessThan(editorIdx);
    });

    it("should not have bare * selector in @layer base", () => {
      const layerBaseMatch = styles.match(
        /@layer base\s*\{([\s\S]*?)\n\}/
      );
      expect(layerBaseMatch).not.toBeNull();
      const layerContent = layerBaseMatch![1];
      const lines = layerContent.split("\n").map((l) => l.trim());
      for (const line of lines) {
        if (line === "*" || line === "* {" || line === "*,") {
          throw new Error(
            `Found bare * selector in @layer base: "${line}" — must be scoped`
          );
        }
      }
    });

    it("should not have bare body selector in @layer base", () => {
      const layerBaseMatch = styles.match(
        /@layer base\s*\{([\s\S]*?)\n\}/
      );
      expect(layerBaseMatch).not.toBeNull();
      const layerContent = layerBaseMatch![1];
      expect(layerContent).not.toMatch(/(?<!\S)body\s*\{/);
    });

    it("should scope @layer base rules with :where(.theme-container)", () => {
      const layerBaseMatch = styles.match(
        /@layer base\s*\{([\s\S]*?)\n\}/
      );
      expect(layerBaseMatch).not.toBeNull();
      const layerContent = layerBaseMatch![1];
      expect(layerContent).toContain(":where(.theme-container)");
    });
  });

  describe("scoped-preflight.css — outbound rules", () => {
    const preflight = readFile("scoped-preflight.css");

    const preflightElements = [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "a", "button", "input", "select", "textarea",
      "img", "svg", "video",
      "ol", "ul", "p", "hr", "table",
      "blockquote", "pre", "code",
      "sub", "sup", "small",
      "fieldset", "legend", "summary", "dialog",
    ];

    it("should not contain bare element selectors (unscoped Preflight)", () => {
      const lines = preflight.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*") ||
          trimmed === "" ||
          trimmed.startsWith("//")
        ) continue;

        for (const el of preflightElements) {
          const barePattern = new RegExp(`^${el}\\s*[,{]`);
          if (barePattern.test(trimmed)) {
            throw new Error(
              `Found unscoped bare element selector "${trimmed}" — ` +
              `must be scoped with :where(.theme-container) or .theme-container .ProseMirror`
            );
          }
        }
      }
    });

    it("should scope all outbound Preflight rules with :where(.theme-container)", () => {
      const outboundSection = preflight.split("Layer 2:")[0];
      const selectorLines = outboundSection
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          return (
            trimmed.length > 0 &&
            !trimmed.startsWith("/*") &&
            !trimmed.startsWith("*") &&
            !trimmed.startsWith("//") &&
            !trimmed.startsWith("{") &&
            !trimmed.startsWith("}") &&
            !trimmed.endsWith(";") &&
            !trimmed.startsWith("@") &&
            !trimmed.startsWith("-") &&
            !trimmed.startsWith("font") &&
            !trimmed.startsWith("line") &&
            !trimmed.startsWith("tab") &&
            !trimmed.startsWith("box") &&
            !trimmed.startsWith("border") &&
            !trimmed.startsWith("color") &&
            !trimmed.startsWith("text") &&
            !trimmed.startsWith("height") &&
            !trimmed.startsWith("bottom") &&
            !trimmed.startsWith("top") &&
            !trimmed.startsWith("position") &&
            !trimmed.startsWith("vertical") &&
            !trimmed.startsWith("letter") &&
            !trimmed.startsWith("margin") &&
            !trimmed.startsWith("padding") &&
            !trimmed.startsWith("list") &&
            !trimmed.startsWith("resize") &&
            !trimmed.startsWith("opacity") &&
            !trimmed.startsWith("cursor") &&
            !trimmed.startsWith("display") &&
            !trimmed.startsWith("max") &&
            !trimmed.startsWith("outline") &&
            !trimmed.startsWith("background") &&
            (trimmed.includes("{") || trimmed.endsWith(","))
          );
        });

      for (const line of selectorLines) {
        const trimmed = line.trim();
        if (
          !trimmed.startsWith(":where(.theme-container)") &&
          !trimmed.startsWith(".theme-container")
        ) {
          throw new Error(
            `Outbound preflight selector is not properly scoped: "${trimmed}"`
          );
        }
      }

      expect(selectorLines.length).toBeGreaterThan(10);
    });

    it("should use :where() (not bare .theme-container) for outbound rules to preserve specificity", () => {
      const outboundSection = preflight.split("Layer 2:")[0];

      const bareThemeContainerPattern =
        /^\.theme-container\s+(?!\.ProseMirror)/m;
      expect(outboundSection).not.toMatch(bareThemeContainerPattern);
    });
  });
});

describe("CSS Scoping — Inbound Isolation", () => {
  const preflight = readFile("scoped-preflight.css");

  const inboundSection = preflight.split("Layer 2:")[1] || "";

  const contentElements = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "blockquote", "pre", "hr",
    "a", "ol", "ul", "li", "table", "img",
  ];

  it("should have ProseMirror-scoped rules for content elements", () => {
    for (const el of contentElements) {
      expect(inboundSection).toContain(`.ProseMirror ${el}`);
    }
  });

  it("should use :where(.theme-container) for inbound rules to not outrank editor styles", () => {
    for (const el of contentElements) {
      const pattern = new RegExp(
        `:where\\(\\.theme-container\\)\\s+\\.ProseMirror\\s+${el}`
      );
      expect(inboundSection).toMatch(pattern);
    }
  });

  it("should NOT use all: revert as a CSS declaration (breaks Tailwind utility specificity)", () => {
    const cssDeclarationPattern = /^\s*all:\s*revert\s*;/m;
    expect(inboundSection).not.toMatch(cssDeclarationPattern);
  });

  it("should explicitly reset text/font properties to block host-app leakage", () => {
    const textElements = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote"];
    for (const el of textElements) {
      const colorPattern = new RegExp(
        `\\.theme-container\\)\\s+\\.ProseMirror\\s+${el}[^}]*color:\\s*inherit`,
        "s"
      );
      expect(inboundSection).toMatch(colorPattern);

      const alignPattern = new RegExp(
        `\\.theme-container\\)\\s+\\.ProseMirror\\s+${el}[^}]*text-align:\\s*inherit`,
        "s"
      );
      expect(inboundSection).toMatch(alignPattern);
    }
  });

  it("should set box-sizing: border-box for content elements", () => {
    const boxSizedElements = contentElements.filter((el) => el !== "hr");
    for (const el of boxSizedElements) {
      const blockPattern = new RegExp(
        `\\.theme-container\\)\\s+\\.ProseMirror\\s+${el}[^}]*box-sizing:\\s*border-box`,
        "s"
      );
      expect(inboundSection).toMatch(blockPattern);
    }
  });
});

describe("CSS Scoping — Build Output", () => {
  const distPath = path.resolve(rootDir, "../dist/styles.css");
  const distExists = fs.existsSync(distPath);

  it.skipIf(!distExists)(
    "should not contain unscoped Preflight global selectors in built CSS",
    () => {
      const css = fs.readFileSync(distPath, "utf-8");
      const lines = css.split("\n");

      const unscopedGlobals = [
        /^html\s*\{/,
        /^html\s*,/,
        /^body\s*\{/,
        /^h1\s*,\s*h2/,
        /^h1\s*\{/,
        /^a\s*\{/,
        /^button\s*\{/,
        /^img\s*,/,
        /^ol\s*,\s*ul/,
        /^blockquote\s*,/,
      ];

      for (const line of lines) {
        const trimmed = line.trim();
        for (const pattern of unscopedGlobals) {
          if (pattern.test(trimmed)) {
            throw new Error(
              `Built CSS contains unscoped global selector: "${trimmed}"`
            );
          }
        }
      }
    }
  );

  it.skipIf(!distExists)(
    "should contain :where(.theme-container) scoped selectors in built CSS",
    () => {
      const css = fs.readFileSync(distPath, "utf-8");
      expect(css).toContain(":where(.theme-container)");
    }
  );

  it.skipIf(!distExists)(
    "should contain :where(.theme-container) .ProseMirror inbound isolation in built CSS",
    () => {
      const css = fs.readFileSync(distPath, "utf-8");
      expect(css).toContain(":where(.theme-container) .ProseMirror h1");
      expect(css).toContain(":where(.theme-container) .ProseMirror p");
    }
  );

  it.skipIf(!distExists)(
    "should not contain Tailwind Preflight (disabled in config)",
    () => {
      const css = fs.readFileSync(distPath, "utf-8");

      const preflightFingerprint =
        /^\*\s*,\s*::before\s*,\s*::after\s*\{\s*[\s\S]*?box-sizing:\s*border-box/m;
      expect(css).not.toMatch(preflightFingerprint);
    }
  );
});
