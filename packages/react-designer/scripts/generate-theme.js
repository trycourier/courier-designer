import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

export function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

// Extract a named `Theme` const (e.g. `defaultTheme`, `darkTheme`) from the
// TypeScript source and parse it into a plain object. Returns undefined when
// the name isn't present, so callers can decide whether absence is fatal.
export function extractTheme(typesContent, name) {
  const match = typesContent.match(new RegExp(`${name}:\\s*Theme\\s*=\\s*(\\{[\\s\\S]*?\\});`));
  if (!match) return undefined;

  // Inline TypeScript spreads (e.g. `...defaultTheme,`) aren't valid JSON —
  // strip them. This works because each named theme we care about is a
  // superset of defaultTheme, and any spread-only values would also be
  // written into the theme literal explicitly by convention.
  const jsonLike = match[1]
    .replace(/\.\.\.[a-zA-Z_$][\w$]*\s*,?/g, "") // drop `...identifier[,]`
    .replace(/(['"])?([a-zA-Z0-9]+)(['"])?:/g, '"$2":') // quote property names
    .replace(/,(\s*[}\]])/g, "$1"); // remove trailing commas

  try {
    return JSON.parse(jsonLike);
  } catch (error) {
    console.error(`Error parsing ${name}:`, error);
    console.error("Parsed string:", jsonLike);
    throw error;
  }
}

export function themeToCssVars(theme) {
  return Object.entries(theme)
    .map(([key, value]) => `  --${camelToKebab(key)}: ${value};`)
    .join("\n");
}

// Pure transform: TypeScript source string -> generated theme.css contents.
// Kept side-effect free so it can be exercised directly from unit tests
// without hitting the filesystem.
export function buildThemeCss(typesContent) {
  const defaultTheme = extractTheme(typesContent, "defaultTheme");
  if (!defaultTheme) {
    throw new Error("Could not find defaultTheme in ThemeProvider.types.ts");
  }

  // `darkTheme` spreads `defaultTheme` and overrides a subset — we need the
  // merged object as CSS vars so consumers who only flip `html.dark` (without
  // mounting a runtime ThemeProvider) still get a complete dark palette.
  const darkThemeOverrides = extractTheme(typesContent, "darkTheme");
  const darkTheme = darkThemeOverrides ? { ...defaultTheme, ...darkThemeOverrides } : undefined;

  const blocks = [`.theme-container {\n${themeToCssVars(defaultTheme)}\n}`];

  if (darkTheme) {
    // Emit the dark palette scoped to `html.dark .theme-container` so host
    // apps that toggle dark mode on <html> (next-themes et al.) get the
    // correct CSS variables for standalone components that portal into the
    // nearest `.theme-container` without a runtime `ThemeProvider` wrapper.
    blocks.push(`html.dark .theme-container {\n${themeToCssVars(darkTheme)}\n}`);
  }

  return `${blocks.join("\n")}\n`;
}

export async function generateThemeCSS({ cwd = process.cwd() } = {}) {
  const typesPath = path.resolve(cwd, "src/components/ui-kit/ThemeProvider/ThemeProvider.types.ts");
  const outDir = path.resolve(cwd, "src/components/generated");
  const outPath = path.resolve(outDir, "theme.css");

  const typesContent = await fs.readFile(typesPath, "utf-8");
  const cssContent = buildThemeCss(typesContent);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, cssContent, "utf-8");
}

// Only auto-run when invoked directly (e.g. `node scripts/generate-theme.js`),
// not when the module is imported by tests.
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  generateThemeCSS().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
