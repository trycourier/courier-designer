import fs from 'fs/promises';
import path from 'path';

function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

async function generateThemeCSS() {
  // Read the ThemeProvider.types.ts file
  const typesContent = await fs.readFile(
    path.resolve('src/components/ui-kit/ThemeProvider/ThemeProvider.types.ts'),
    'utf-8'
  );

  // Extract the defaultTheme object using regex
  const themeMatch = typesContent.match(/defaultTheme:\s*Theme\s*=\s*({[\s\S]*?});/);
  if (!themeMatch) {
    throw new Error('Could not find defaultTheme in ThemeProvider.types.ts');
  }

  // Convert TypeScript object to valid JSON
  const themeString = themeMatch[1]
    .replace(/(['"])?([a-zA-Z0-9]+)(['"])?:/g, '"$2":') // Ensure property names are quoted
    .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

  try {
    const theme = JSON.parse(themeString);

    // Generate CSS variables with kebab-case names
    const cssVariables = Object.entries(theme)
      .map(([key, value]) => `  --${camelToKebab(key)}: ${value};`)
      .join('\n');

    // Create the theme CSS content
    const cssContent = `.lightTheme {\n${cssVariables}\n}\n`;

    // Ensure the generated directory exists
    await fs.mkdir(path.resolve('src/components/generated'), { recursive: true });

    // Write the theme.css file
    await fs.writeFile(
      path.resolve('src/components/generated/theme.css'),
      cssContent,
      'utf-8'
    );
  } catch (error) {
    console.error('Error parsing theme object:', error);
    console.error('Theme string:', themeString);
    throw error;
  }
}

generateThemeCSS().catch(console.error); 