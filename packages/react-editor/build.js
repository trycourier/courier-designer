import * as esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import postcssImport from "postcss-import";
import fs from "fs/promises";

const isWatch = process.argv.includes("--watch");

const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  external: ["react", "react-dom"],
  plugins: [dtsPlugin()],
};

const buildCSS = async () => {
  const css = await fs.readFile("src/styles.css", "utf8");
  const result = await postcss([
    postcssImport, // Add this first
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
