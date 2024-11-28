import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@trycourier/react-editor/styles.css": path.resolve(
        __dirname,
        "../../packages/react-editor/dist/styles.css"
      ),
      // "@trycourier/react-editor/index.css": path.resolve(
      //   __dirname,
      //   "../../packages/react-editor/dist/index.css"
      // ),
      "@trycourier/react-editor": path.resolve(
        __dirname,
        "../../packages/react-editor/src/index.ts"
      ),
    },
  },
});
