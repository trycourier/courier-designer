import { execSync } from 'child_process';
import * as esbuild from "esbuild";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getCjsBuildOptions, getEsmBuildOptions } from './config/build-config.js';
import { processCss } from './scripts/css-processor.js';

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

    // Get build configurations
    const esmBuildOptions = getEsmBuildOptions();
    const cjsBuildOptions = getCjsBuildOptions();

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