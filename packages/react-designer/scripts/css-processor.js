import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import postcssImport from "postcss-import";
import postcssNested from 'postcss-nested';
import fs from "fs/promises";
import { resolve } from 'path';


/**
 * Selectors the chip markup emits — the chips themselves, their state and kind
 * variants, and the three layout utilities used by `renderVariablesInHtmlString`.
 */
const CHIP_PREFIXES = ['courier-variable-chip', 'courier-handlebars-chip'];

/** Layout utilities the chip markup emits, matched exactly so siblings like
 * `courier-flex-col` do not ride along. */
const CHIP_UTILITIES = ['courier-flex-shrink-0', 'courier-items-center', 'courier-flex'];

/**
 * A chip-only stylesheet, for a surface that renders chip markup somewhere the
 * main stylesheet must not go — an email preview `iframe`, where Tailwind's
 * preflight would strip the customer's table borders, link colours and
 * underlines and stop the preview showing what the send looks like.
 *
 * Sliced from the processed output rather than authored separately, so it
 * cannot drift from what the design view uses.
 */
export const extractChipStyles = (css) => {
  const root = postcss.parse(css);
  const kept = postcss.root();

  const isChipRule = (rule) => {
    if (CHIP_PREFIXES.some((name) => rule.selector.includes(name))) return true;
    // An exact class match: `.courier-flex` yes, `.courier-flex-col` no.
    return CHIP_UTILITIES.some((name) =>
      new RegExp(`\\.${name}(?![\\w-])`).test(rule.selector)
    );
  };

  root.each((node) => {
    if (node.type === 'rule' && isChipRule(node)) {
      kept.append(node.clone());
      return;
    }
    // Keep a media query only for the chip rules inside it.
    if (node.type === 'atrule' && node.nodes) {
      const inner = node.nodes.filter((child) => child.type === 'rule' && isChipRule(child));
      if (inner.length) {
        const wrapper = node.clone();
        wrapper.removeAll();
        inner.forEach((child) => wrapper.append(child.clone()));
        kept.append(wrapper);
      }
    }
  });

  return `/* Chip styles only — no preflight, safe to inject into a preview iframe. */\n${kept.toString()}\n`;
};

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

    const chipCss = extractChipStyles(result.css);

    // Write to all necessary locations
    await Promise.all([
      fs.writeFile('dist/styles.css', result.css),
      fs.writeFile('dist/esm/styles.css', result.css),
      fs.writeFile('dist/cjs/styles.css', result.css),
      fs.writeFile('dist/chip-styles.css', chipCss),
      fs.writeFile('dist/esm/chip-styles.css', chipCss),
      fs.writeFile('dist/cjs/chip-styles.css', chipCss)
    ]);
  } catch (error) {
    console.error('CSS Processing Error:', error);
    throw error;
  }
};