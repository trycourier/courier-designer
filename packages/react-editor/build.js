import * as esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import postcssImport from "postcss-import";
import postcssNested from 'postcss-nested';
import fs from "fs/promises";
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes("--watch");
const isAnalyze = process.argv.includes("--analyze");

// Custom plugin to rewrite CSS imports
const cssImportPlugin = {
  name: 'css-import',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, args => {
      if (args.kind === 'import-statement') {
        // Return the path relative to the package root
        return { path: './styles.css', external: true };
      }
      return { path: args.path, external: true };
    });
  }
};

const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  platform: 'browser',
  target: ['es2019'],
  sourcemap: true,
  metafile: true,
  loader: {
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.jpeg': 'dataurl',
    '.gif': 'dataurl',
  },
  plugins: [
    dtsPlugin(),
    cssImportPlugin,
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
    global: 'window',
  },
  banner: {
    js: '"use client";',
  },
  jsx: 'automatic',
  external: ['react', 'react-dom'],
  mainFields: ['module', 'main'],
  conditions: ['module', 'import', 'require', 'default'],
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  logLevel: 'info',
  logLimit: 0,
};

// Process all CSS files and combine them
const processCss = async () => {
  try {
    // Read and process the main styles file which contains imports
    const mainStylePath = resolve(__dirname, 'src/styles.css');
    const css = await fs.readFile(mainStylePath, 'utf8');

    const result = await postcss([
      postcssImport({
        root: __dirname,
        resolve: (id, basedir) => {
          if (id.startsWith('@tailwind') || id.startsWith('tailwindcss/')) {
            return id;
          }
          return resolve(basedir, id);
        }
      }),
      postcssNested,
      tailwindcss,
      autoprefixer,
    ]).process(css, {
      from: mainStylePath,
      map: false
    });

    // Write to dist/styles.css (root level)
    await fs.mkdir('dist', { recursive: true });
    await fs.writeFile('dist/styles.css', result.css);
  } catch (error) {
    console.error('CSS Processing Error:', error);
    throw error;
  }
};

// ESM build configuration
const esmBuildOptions = {
  ...shared,
  format: "esm",
  outdir: "dist/esm",
  splitting: false,
};

// CJS build configuration
const cjsBuildOptions = {
  ...shared,
  format: "cjs",
  outdir: "dist/cjs",
  splitting: false,
};

// Main build function
const build = async () => {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(esmBuildOptions);
      await ctx.watch();
      await processCss();
      console.log("👀 Watching for changes...");
    } else {
      console.log("🏗️  Building package...");

      // Process CSS first
      await processCss();
      console.log("✅ CSS processing completed");

      const esmResult = await esbuild.build(esmBuildOptions);
      console.log("✅ ESM build completed");

      const cjsResult = await esbuild.build(cjsBuildOptions);
      console.log("✅ CJS build completed");

      if (isAnalyze) {
        const text = await esbuild.analyzeMetafile(esmResult.metafile);
        console.log("\nBundle analysis:", text);
      }

      console.log("✨ Build completed successfully!");
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

build();