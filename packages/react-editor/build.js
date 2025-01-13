import * as esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import postcssImport from "postcss-import";
import postcssNested from 'postcss-nested';
import fs from "fs/promises";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes("--watch");

const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  external: ["react", "react-dom"],
  plugins: [dtsPlugin()],
};

const generateTheme = async () => {
  const generateThemeScript = join(__dirname, 'scripts/generate-theme.js');
  await import(generateThemeScript);
  // Wait a bit to ensure file is written
  await new Promise(resolve => setTimeout(resolve, 100));
};

const buildCSS = async () => {
  // Ensure theme is generated before processing CSS
  await generateTheme();

  const css = await fs.readFile("src/styles.css", "utf8");
  const result = await postcss([
    postcssImport,
    postcssNested,
    tailwindcss,
    autoprefixer,
  ]).process(css, {
    from: "src/styles.css",
    map: false,
  });
  await fs.writeFile("dist/styles.css", result.css);
};

const buildOptions = {
  ...shared,
  format: "esm",
  outfile: "dist/index.mjs",
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  await buildCSS();
  console.log("Watching for changes...");
} else {
  await buildCSS();
  await esbuild.build(buildOptions);
  await esbuild.build({
    ...shared,
    format: "cjs",
    outfile: "dist/index.js",
  });
}
