import fs from "fs/promises";
import { dirname, resolve } from 'path';
import { dtsPlugin } from "esbuild-plugin-d.ts";

// Custom plugin to rewrite CSS imports
export const cssImportPlugin = {
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

// Export all plugins in an array for easy import
export const getPlugins = () => [
  dtsPlugin(),
  cssImportPlugin,
];