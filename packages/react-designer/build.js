import { execSync } from 'child_process';
import * as esbuild from "esbuild";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getCjsBuildOptions, getEsmBuildOptions } from './config/build-config.js';
import { processCss } from './scripts/css-processor.js';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes("--watch");
const isAnalyze = process.argv.includes("--analyze");

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

// Get external dependencies from package.json
const getExternalDeps = () => {
  try {
    const packageJsonPath = path.resolve(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Combine dependencies and peerDependencies
    const deps = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {})
    ];

    // Ensure React and ReactDOM are always external
    if (!deps.includes('react')) deps.push('react');
    if (!deps.includes('react-dom')) deps.push('react-dom');

    // Add tippy.js dependencies
    deps.push('@tippyjs/react');
    deps.push('@tippyjs/react/headless');
    deps.push('prosemirror-model');
    deps.push('prosemirror-state');
    deps.push('prosemirror-transform');
    deps.push('prosemirror-view');

    // Remove @atlaskit/pragmatic-drag-and-drop packages from externals
    // These need to be bundled because their entry point files have relative imports
    // that don't work when externalized in ESM
    const pragmaticDndPackages = [
      '@atlaskit/pragmatic-drag-and-drop',
      '@atlaskit/pragmatic-drag-and-drop-hitbox',
    ];
    // date-fns 2 / date-fns-tz 1 ship ESM only under `module`, with no `exports`,
    // so Node's ESM loader falls back to CJS and loses the named exports.
    // Bundling also pins the exact versions the renderer uses.
    const bundledPackages = [...pragmaticDndPackages, 'date-fns', 'date-fns-tz'];
    const filteredDeps = deps.filter(dep => {
      return !bundledPackages.some(pkg => dep === pkg || dep.startsWith(`${pkg}/`) || (pkg.startsWith('@atlaskit') && dep.startsWith(pkg)));
    });

    console.log("📦 External dependencies:", filteredDeps);
    return filteredDeps;
  } catch (error) {
    console.error("Error parsing package.json:", error);
    // Fallback to essential externals if package.json can't be read
    return ['react', 'react-dom', '@tippyjs/react', '@tippyjs/react/headless'];
  }
};

// Main build function
const build = async () => {
  try {
    console.log("🏗️  Building package...");

    // Generate theme first
    await generateTheme();
    console.log("✅ Theme generation completed");

    // Process CSS next
    await processCss(__dirname);
    console.log("✅ CSS processing completed");

    // Get external dependencies
    const externalDeps = getExternalDeps();

    // Get build configurations with external deps
    const esmBuildOptions = getEsmBuildOptions(externalDeps);
    const cjsBuildOptions = getCjsBuildOptions(externalDeps);

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