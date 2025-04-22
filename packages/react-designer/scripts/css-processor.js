import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import postcssImport from "postcss-import";
import postcssNested from 'postcss-nested';
import fs from "fs/promises";
import { resolve } from 'path';

// Process all CSS files and combine them
export const processCss = async (rootDir) => {
  try {
    // Read and process the main styles file which contains imports
    const mainStylePath = resolve(rootDir, 'src/styles.css');
    const css = await fs.readFile(mainStylePath, 'utf8');

    const result = await postcss([
      postcssImport({
        root: rootDir,
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