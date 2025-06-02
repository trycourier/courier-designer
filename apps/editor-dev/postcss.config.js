import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default (ctx) => {
  const plugins = [autoprefixer];

  // Get the file path being processed
  const filePath = ctx.from || ctx.file || "";

  // Only apply tailwindcss to files that are NOT from react-designer package
  const shouldApplyTailwind =
    !filePath.includes("react-designer") && !filePath.includes("@trycourier/react-designer");

  if (shouldApplyTailwind) {
    plugins.unshift(tailwindcss);
  }

  return { plugins };
};
