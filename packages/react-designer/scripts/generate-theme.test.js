import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  camelToKebab,
  extractTheme,
  themeToCssVars,
  buildThemeCss,
  generateThemeCSS,
} from "./generate-theme.js";

const SAMPLE_TYPES_SRC = `export interface Theme {
  colorScheme?: "light" | "dark";
  background?: string;
  mutedForeground?: string;
  radius?: string;
}

export const defaultTheme: Theme = {
  colorScheme: "light",
  background: "#ffffff",
  mutedForeground: "#A3A3A3",
  radius: "6px",
};

export const lightTheme: Theme = {
  ...defaultTheme,
};

export const darkTheme: Theme = {
  ...defaultTheme,
  colorScheme: "dark",
  background: "#262626",
  mutedForeground: "#C9C8E1",
};
`;

describe("camelToKebab", () => {
  it("converts camelCase to kebab-case", () => {
    expect(camelToKebab("colorScheme")).toBe("color-scheme");
    expect(camelToKebab("mutedForeground")).toBe("muted-foreground");
    expect(camelToKebab("primaryForeground")).toBe("primary-foreground");
  });

  it("leaves single-word identifiers untouched", () => {
    expect(camelToKebab("background")).toBe("background");
    expect(camelToKebab("ring")).toBe("ring");
  });

  it("only inserts a dash between a lowercase/digit and a following capital", () => {
    // Documents current behaviour: consecutive capitals are NOT split.
    // No real Theme key has this shape (all are camelCase), so we don't
    // need to handle it — but pin the contract explicitly.
    expect(camelToKebab("borderXY")).toBe("border-xy");
    expect(camelToKebab("color2X")).toBe("color2-x");
  });
});

describe("extractTheme", () => {
  it("parses defaultTheme into a plain object", () => {
    expect(extractTheme(SAMPLE_TYPES_SRC, "defaultTheme")).toEqual({
      colorScheme: "light",
      background: "#ffffff",
      mutedForeground: "#A3A3A3",
      radius: "6px",
    });
  });

  it("strips spread syntax from darkTheme so JSON.parse can succeed", () => {
    expect(extractTheme(SAMPLE_TYPES_SRC, "darkTheme")).toEqual({
      colorScheme: "dark",
      background: "#262626",
      mutedForeground: "#C9C8E1",
    });
  });

  it("treats lightTheme (spread-only) as an empty object", () => {
    // lightTheme is `{ ...defaultTheme }` with no own keys — once the spread
    // is stripped, we're left with `{}`. The merge in `buildThemeCss`
    // handles the actual fallback to defaultTheme.
    expect(extractTheme(SAMPLE_TYPES_SRC, "lightTheme")).toEqual({});
  });

  it("returns undefined when the named theme is absent", () => {
    expect(extractTheme(SAMPLE_TYPES_SRC, "nonexistentTheme")).toBeUndefined();
  });

  it("removes trailing commas before closing brace", () => {
    const src = `export const myTheme: Theme = {
      foo: "bar",
      baz: "qux",
    };`;
    expect(extractTheme(src, "myTheme")).toEqual({ foo: "bar", baz: "qux" });
  });

  it("handles spreads without trailing commas", () => {
    const src = `export const myTheme: Theme = {
      ...defaultTheme
      foo: "bar",
    };`;
    // Even a malformed spread (no trailing comma) should be stripped cleanly.
    expect(extractTheme(src, "myTheme")).toEqual({ foo: "bar" });
  });

  it("throws with diagnostic context when the body cannot be parsed", () => {
    const src = `export const broken: Theme = {
      foo: not-valid-json,
    };`;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => extractTheme(src, "broken")).toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error parsing broken"),
        expect.anything()
      );
      expect(errorSpy).toHaveBeenCalledWith("Parsed string:", expect.any(String));
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("themeToCssVars", () => {
  it("emits one indented CSS custom property per entry", () => {
    expect(
      themeToCssVars({
        colorScheme: "light",
        background: "#ffffff",
        mutedForeground: "#A3A3A3",
      })
    ).toBe(
      [
        "  --color-scheme: light;",
        "  --background: #ffffff;",
        "  --muted-foreground: #A3A3A3;",
      ].join("\n")
    );
  });

  it("returns an empty string for an empty theme", () => {
    expect(themeToCssVars({})).toBe("");
  });
});

describe("buildThemeCss", () => {
  it("emits a single .theme-container block when only defaultTheme is present", () => {
    const src = `export const defaultTheme: Theme = {
      background: "#ffffff",
      radius: "6px",
    };`;

    const css = buildThemeCss(src);

    expect(css).toBe(
      [
        ".theme-container {",
        "  --background: #ffffff;",
        "  --radius: 6px;",
        "}",
        "",
      ].join("\n")
    );
    expect(css).not.toContain("html.dark");
  });

  it("emits a merged html.dark .theme-container block when darkTheme is present", () => {
    const css = buildThemeCss(SAMPLE_TYPES_SRC);

    expect(css).toContain(".theme-container {");
    expect(css).toContain("html.dark .theme-container {");

    // Default block should reflect light values verbatim.
    expect(css).toMatch(/\.theme-container \{[^}]*--background: #ffffff;[^}]*\}/s);

    // Dark block must merge defaults with overrides — `radius` is only on
    // defaultTheme, but it must still appear in the dark block (otherwise
    // consumers using `html.dark` lose the variable entirely).
    expect(css).toMatch(/html\.dark \.theme-container \{[^}]*--radius: 6px;[^}]*\}/s);

    // And dark overrides must win over defaults.
    expect(css).toMatch(/html\.dark \.theme-container \{[^}]*--background: #262626;[^}]*\}/s);
    expect(css).toMatch(
      /html\.dark \.theme-container \{[^}]*--muted-foreground: #C9C8E1;[^}]*\}/s
    );
    expect(css).toMatch(/html\.dark \.theme-container \{[^}]*--color-scheme: dark;[^}]*\}/s);
  });

  it("ends with a single trailing newline", () => {
    const css = buildThemeCss(SAMPLE_TYPES_SRC);
    expect(css.endsWith("\n")).toBe(true);
    expect(css.endsWith("\n\n")).toBe(false);
  });

  it("throws a clear error when defaultTheme is missing", () => {
    expect(() =>
      buildThemeCss(`export const lightTheme: Theme = { ...defaultTheme };`)
    ).toThrow(/Could not find defaultTheme/);
  });

  it("matches the committed generated/theme.css for the real source", async () => {
    // Golden-file check: feeding the actual checked-in ThemeProvider.types.ts
    // through the pipeline must reproduce the committed generated CSS.
    // If this fails, either the script behaviour changed or someone edited
    // the theme TS without re-running `pnpm build` / `node scripts/generate-theme.js`.
    const repoTypesPath = path.resolve(
      __dirname,
      "../src/components/ui-kit/ThemeProvider/ThemeProvider.types.ts"
    );
    const repoCssPath = path.resolve(__dirname, "../src/components/generated/theme.css");

    const [typesSrc, expectedCss] = await Promise.all([
      fs.readFile(repoTypesPath, "utf-8"),
      fs.readFile(repoCssPath, "utf-8"),
    ]);

    expect(buildThemeCss(typesSrc)).toBe(expectedCss);
  });
});

describe("generateThemeCSS (IO)", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "generate-theme-test-"));
    const typesDir = path.join(tmpDir, "src/components/ui-kit/ThemeProvider");
    await fs.mkdir(typesDir, { recursive: true });
    await fs.writeFile(path.join(typesDir, "ThemeProvider.types.ts"), SAMPLE_TYPES_SRC, "utf-8");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes the generated CSS into src/components/generated/theme.css", async () => {
    await generateThemeCSS({ cwd: tmpDir });

    const written = await fs.readFile(
      path.join(tmpDir, "src/components/generated/theme.css"),
      "utf-8"
    );
    expect(written).toBe(buildThemeCss(SAMPLE_TYPES_SRC));
  });

  it("creates the generated directory if it does not exist", async () => {
    const generatedDir = path.join(tmpDir, "src/components/generated");
    await expect(fs.access(generatedDir)).rejects.toThrow();

    await generateThemeCSS({ cwd: tmpDir });

    await expect(fs.access(generatedDir)).resolves.toBeUndefined();
  });
});
