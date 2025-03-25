import { getPlugins } from './esbuild-plugins.js';

// Shared build configuration
const getSharedConfig = () => ({
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
  plugins: getPlugins(),
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