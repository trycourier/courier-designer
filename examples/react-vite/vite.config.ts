import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dotenv from "dotenv";

// Load this example's own .env, by path rather than by cwd. Each example under
// examples/ carries its own configuration (see .env.example alongside), so the
// values must come from this directory whether the dev server is started from
// here or from the repo root via turbo.
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  plugins: [react()],
  // Vite's own import.meta.env loading, pointed at the same directory.
  envDir: __dirname,
  define: {
    // Make process.env values available in the client
    "process.env.API_URL": JSON.stringify(process.env.VITE_API_URL),
    "process.env.UPLOAD_IMAGE_URL": JSON.stringify(process.env.VITE_UPLOAD_IMAGE_URL),
    "process.env.TEMPLATE_ID": JSON.stringify(process.env.VITE_TEMPLATE_ID),
    "process.env.TENANT_ID": JSON.stringify(process.env.VITE_TENANT_ID),
    "process.env.CLIENT_KEY": JSON.stringify(process.env.VITE_CLIENT_KEY),
    "process.env.JWT_TOKEN": JSON.stringify(process.env.VITE_JWT_TOKEN),
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@trycourier/react-designer/styles.css": path.resolve(
        __dirname,
        "../../@trycourier/react-designer/dist/styles.css"
      ),
      "@trycourier/react-designer": path.resolve(
        __dirname,
        "../../@trycourier/react-designer/dist/esm/index.js"
      ),
      "@": path.resolve(__dirname, "../../@trycourier/react-designer/src"),
    },
  },
});
