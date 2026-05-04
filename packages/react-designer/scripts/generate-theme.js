import fs from "fs/promises";
import path from "path";

function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

// Extract a named `Theme` const (e.g. `defaultTheme`, `darkTheme`) from the
// TypeScript source and parse it into a plain object. Returns undefined when
// the name isn't present, so callers can decide whether absence is fatal.
function extractTheme(typesContent, name) {
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

function themeToCssVars(theme) {
  return Object.entries(theme)
    .map(([key, value]) => `  --${camelToKebab(key)}: ${value};`)
    .join("\n");
}

async function generateThemeCSS() {
  // Read the ThemeProvider.types.ts file
  const typesContent = await fs.readFile(
    path.resolve("src/components/ui-kit/ThemeProvider/ThemeProvider.types.ts"),
    "utf-8"
  );

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

  const cssContent = `${blocks.join("\n")}\n`;

  // Ensure the generated directory exists
  await fs.mkdir(path.resolve("src/components/generated"), { recursive: true });

  // Write the theme.css file
  await fs.writeFile(path.resolve("src/components/generated/theme.css"), cssContent, "utf-8");
}

generateThemeCSS().catch((error) => {
  console.error(error);
  process.exit(1);
});
