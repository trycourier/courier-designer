import * as esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";

const isWatch = process.argv.includes("--watch");

const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  external: ["react", "react-dom"],
  plugins: [dtsPlugin()],
};

const buildOptions = {
  ...shared,
  format: "esm",
  outfile: "dist/index.mjs",
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  await esbuild.build({
    ...shared,
    format: "cjs",
    outfile: "dist/index.js",
  });
}
