import { getPlugins } from "./esbuild-plugins.js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Shared build configuration
const getSharedConfig = (externalDeps = []) => ({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  keepNames: true, // Keep original names to avoid reference errors
  platform: "browser",
  target: ["es2019"],
  sourcemap: true,
  metafile: true,
  treeShaking: true,
  drop: ["debugger"],
  loader: {
    ".svg": "dataurl",
    ".png": "dataurl",
    ".jpg": "dataurl",
    ".jpeg": "dataurl",
    ".gif": "dataurl",
  },
  plugins: getPlugins(),
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.API_URL": JSON.stringify(process.env.API_URL || ""),
    global: "window",
  },
  banner: {
    js: `"use client";
// Crypto polyfill
function generateUniqueIdPolyfill(prefix = 'node') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return \`\${prefix}-\${timestamp}-\${random}\`;
}

function getRandomValuesPolyfill(array) {
  if (!array || !(array instanceof Uint8Array)) {
    throw new Error('Only Uint8Array is supported in this polyfill');
  }
  for (let i = 0; i < array.length; i++) {
    const uniqueId = generateUniqueIdPolyfill('');
    const numStr = uniqueId.split('-').slice(1).join('');
    array[i] = parseInt(numStr.slice(i % (numStr.length - 8), i % (numStr.length - 8) + 8), 16) % 256;
  }
  return array;
}

const cryptoPolyfill = { getRandomValues: getRandomValuesPolyfill };

if (typeof crypto === "undefined") {
  globalThis.crypto = cryptoPolyfill;
} else if (typeof crypto.getRandomValues === "undefined") {
  crypto.getRandomValues = cryptoPolyfill.getRandomValues;
}

// Next.js compatibility - Ensure React is loaded properly
if (typeof React === "undefined" && typeof require !== "undefined") {
  // Use a global reference approach instead of dynamic requires
  globalThis.React = globalThis.React || {};
}

// Handle tippy.js imports for Next.js
if (typeof require !== "undefined") {
  // Create a wrapper for tippy.js to avoid dynamic imports
  try {
    if (typeof globalThis.tippyImports === 'undefined') {
      globalThis.tippyImports = {};
    }
  } catch (e) {
    console.warn('Unable to setup tippy imports polyfill');
  }
}`,
  },
  jsx: "automatic",
  // Ensure ALL dependencies are properly externalized
  external: externalDeps,
  mainFields: ["module", "main"],
  conditions: ["module", "import", "require", "default"],
  resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  logLevel: "info",
  logLimit: 0,
});

// ESM build configuration
export const getEsmBuildOptions = (externalDeps) => ({
  ...getSharedConfig(externalDeps),
  format: "esm",
  outdir: "dist/esm",
  splitting: false,
});

// CJS build configuration
export const getCjsBuildOptions = (externalDeps) => ({
  ...getSharedConfig(externalDeps),
  format: "cjs",
  outdir: "dist/cjs",
  splitting: false,
});
