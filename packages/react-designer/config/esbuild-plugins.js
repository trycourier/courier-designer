import fs from "fs/promises";
import { dirname, resolve } from "path";
import { dtsPlugin } from "esbuild-plugin-d.ts";

// Custom plugin to handle React references consistently
const reactReferencePlugin = {
  name: "react-reference-fix",
  setup(build) {
    // Ensure React and ReactDOM are properly referenced
    build.onResolve({ filter: /^react$|^react-dom$/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

// Custom plugin to handle tippy.js imports properly
const tippyReferencePlugin = {
  name: "tippy-reference-fix",
  setup(build) {
    // Handle @tippyjs/react and its subpath imports (like headless)
    build.onResolve({ filter: /^@tippyjs\/react(\/.*)?$/ }, (args) => {
      return { path: args.path, external: true };
    });

    // Handle specific UMD imports
    build.onResolve({ filter: /tippy-react-headless\.umd\.js$/ }, (args) => {
      return { path: "@tippyjs/react/headless", external: true };
    });

    // Also handle possible esm imports
    build.onResolve({ filter: /tippy-react-headless\.esm\.js$/ }, (args) => {
      return { path: "@tippyjs/react/headless", external: true };
    });
  },
};

// Custom plugin to rewrite CSS imports - make all CSS external
export const cssImportPlugin = {
  name: "css-import",
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => {
      // Make ALL CSS imports external - they should be imported separately by the consumer
      return { path: args.path, external: true, sideEffects: false };
    });
  },
};

// Plugin to prevent name minification of React.forwardRef and other critical functions
const safeMinifyPlugin = {
  name: "safe-minify",
  setup(build) {
    build.onLoad({ filter: /\.(jsx|tsx)$/ }, async (args) => {
      const source = await fs.readFile(args.path, "utf8");

      // Preserve critical function names like forwardRef
      const safeSource = source
        .replace(/React\.forwardRef/g, "/* @__PURE__ */ React.forwardRef")
        .replace(/React\.createContext/g, "/* @__PURE__ */ React.createContext")
        .replace(/React\.createRef/g, "/* @__PURE__ */ React.createRef")
        .replace(/React\.createElement/g, "/* @__PURE__ */ React.createElement");

      return {
        contents: safeSource,
        loader: args.path.endsWith(".tsx") ? "tsx" : "jsx",
      };
    });
  },
};

// Next.js compatibility plugin
const nextCompatPlugin = {
  name: "next-compat",
  setup(build) {
    // Ensure client directive is included
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      try {
        // Add "use client" directive to all output JS files if not already present
        const outdir = build.initialOptions.outdir;
        if (!outdir) return;

        const files = await fs.readdir(outdir);
        for (const file of files) {
          if (!file.endsWith(".js")) continue;

          const filePath = `${outdir}/${file}`;
          const content = await fs.readFile(filePath, "utf8");

          if (!content.includes('"use client"')) {
            await fs.writeFile(filePath, `"use client";\n${content}`);
          }
        }
      } catch (error) {
        console.error("Next.js compatibility plugin error:", error);
      }
    });
  },
};

// Plugin to replace dynamic imports with static ones for problematic packages
const dynamicImportRemapPlugin = {
  name: "dynamic-import-remap",
  setup(build) {
    build.onLoad({ filter: /\.(jsx|tsx|js|ts)$/ }, async (args) => {
      const source = await fs.readFile(args.path, "utf8");

      // Find dynamic imports of tippy.js and replace them with static ones
      const replacedSource = source
        // Replace dynamic imports with static imports for @tippyjs/react/headless
        .replace(
          /import\((['"])@tippyjs\/react\/headless\1\)/g,
          "require('@tippyjs/react/headless')"
        )
        .replace(/import\((['"])@tippyjs\/react\1\)/g, "require('@tippyjs/react')")
        // Convert other dynamic imports that might cause issues in Next.js
        .replace(
          /const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+import\((['"])@tippyjs\/react\/headless\2\)/g,
          "const $1 = require('@tippyjs/react/headless')"
        );

      // If no changes were made, return null to let the default loader handle it
      if (replacedSource === source) {
        return null;
      }

      return {
        contents: replacedSource,
        loader: args.path.endsWith(".tsx")
          ? "tsx"
          : args.path.endsWith(".jsx")
            ? "jsx"
            : args.path.endsWith(".ts")
              ? "ts"
              : "js",
      };
    });
  },
};

// Export all plugins in an array for easy import
export const getPlugins = () => [
  dtsPlugin(),
  cssImportPlugin,
  reactReferencePlugin,
  tippyReferencePlugin,
  safeMinifyPlugin,
  nextCompatPlugin,
  dynamicImportRemapPlugin,
];
