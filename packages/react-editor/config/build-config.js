import { getPlugins } from './esbuild-plugins.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Shared build configuration
const getSharedConfig = () => ({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  keepNames: true,
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
  plugins: getPlugins(),
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.API_URL': JSON.stringify(process.env.API_URL || ''),
    global: 'window',
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
}`,
  },
  jsx: 'automatic',
  external: ['react', 'react-dom'],
  mainFields: ['module', 'main'],
  conditions: ['module', 'import', 'require', 'default'],
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  logLevel: 'info',
  logLimit: 0,
});

// ESM build configuration
export const getEsmBuildOptions = () => ({
  ...getSharedConfig(),
  format: "esm",
  outdir: "dist/esm",
  splitting: false,
});

// CJS build configuration
export const getCjsBuildOptions = () => ({
  ...getSharedConfig(),
  format: "cjs",
  outdir: "dist/cjs",
  splitting: false,
});