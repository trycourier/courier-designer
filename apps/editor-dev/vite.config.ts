import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@trycourier/courier-editor/styles.css": path.resolve(
        __dirname,
        "../../packages/react-editor/dist/styles.css"
      ),
      "@trycourier/courier-editor": path.resolve(
        __dirname,
        "../../packages/react-editor/src/index.ts"
      ),
      "@": path.resolve(__dirname, "../../packages/react-editor/src"),
    },
  },
});
