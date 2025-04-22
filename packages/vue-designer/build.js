const esbuild = require("esbuild");
const { build } = require("esbuild");
const { parse } = require("@vue/compiler-sfc");
const fs = require("fs");

const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const sharedConfig = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: false,
  sourcemap: true,
  outdir: "dist",
  external: ["vue", "react", "react-dom", "@trycourier/react-designer"],
  plugins: [
    {
      name: "vue",
      setup(build) {
        build.onLoad({ filter: /\.vue$/ }, async (args) => {
          const source = fs.readFileSync(args.path, "utf8");
          const { descriptor } = parse(source);

          const script = descriptor.script || descriptor.scriptSetup;
          if (!script) {
            return { contents: "" };
          }

          return {
            contents: script.content,
            loader: "tsx",
          };
        });
      },
    },
  ],
};

async function main() {
  try {
    await build({
      ...sharedConfig,
      format: "esm",
      outExtension: { ".js": ".mjs" },
    });

    await build({
      ...sharedConfig,
      format: "cjs",
      outExtension: { ".js": ".js" },
    });

    if (isWatch) {
      console.log("Watching for changes...");
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

if (isWatch) {
  require("esbuild")
    .context({
      ...sharedConfig,
    })
    .then((ctx) => ctx.watch());
} else {
  main();
}
