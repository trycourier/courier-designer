import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@trycourier/react-editor": path.resolve(
        __dirname,
        "../../packages/react-editor/src/index.ts"
      ),
    },
  },
});
