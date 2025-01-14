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
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes("--watch");
const isAnalyze = process.argv.includes("--analyze");

// Function to run theme generation script
const generateTheme = async () => {
  try {
    console.log("🎨 Generating theme...");
    execSync('node scripts/generate-theme.js', { stdio: 'inherit' });
    console.log("✅ Theme generated successfully");
  } catch (error) {
    console.error("Error generating theme:", error);
    throw error;
  }
};

// Custom plugin to rewrite CSS imports
const cssImportPlugin = {
  name: 'css-import',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, args => {
      // Handle relative imports from source files
      if (args.path.startsWith('./') || args.path.startsWith('../')) {
        return {
          path: resolve(dirname(args.importer), args.path),
          namespace: 'css-file'
        };
      }
      // Handle package imports (like @trycourier/react-editor/styles.css)
      if (args.path.includes('@trycourier/react-editor')) {
        return { path: './styles.css', external: true };
      }
      return { path: args.path, external: true };
    });

    build.onLoad({ filter: /\.css$/, namespace: 'css-file' }, async (args) => {
      const css = await fs.readFile(args.path, 'utf8');
      return {
        contents: css,
        loader: 'css'
      };
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

    // Write to multiple locations to ensure availability
    await fs.mkdir('dist', { recursive: true });
    await fs.mkdir('dist/esm', { recursive: true });
    await fs.mkdir('dist/cjs', { recursive: true });

    // Write to all necessary locations
    await Promise.all([
      fs.writeFile('dist/styles.css', result.css),
      fs.writeFile('dist/esm/styles.css', result.css),
      fs.writeFile('dist/cjs/styles.css', result.css)
    ]);
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
    console.log("🏗️  Building package...");

    // Generate theme first
    await generateTheme();
    console.log("✅ Theme generation completed");

    // Process CSS next
    await processCss();
    console.log("✅ CSS processing completed");

    if (isWatch) {
      const ctx = await esbuild.context(esmBuildOptions);
      await ctx.watch();
      console.log("👀 Watching for changes...");
    } else {
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