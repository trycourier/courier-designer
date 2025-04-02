import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  plugins: [react()],
  define: {
    // Make process.env values available in the client
    'process.env.API_URL': JSON.stringify(process.env.VITE_API_URL),
    'process.env.TEMPLATE_ID': JSON.stringify(process.env.VITE_TEMPLATE_ID),
    'process.env.TENANT_ID': JSON.stringify(process.env.VITE_TENANT_ID),
    'process.env.CLIENT_KEY': JSON.stringify(process.env.VITE_CLIENT_KEY),
    'process.env.JWT_TOKEN': JSON.stringify(process.env.VITE_JWT_TOKEN),
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@trycourier/react-editor/styles.css": path.resolve(
        __dirname,
        "../../packages/react-editor/dist/styles.css"
      ),
      "@trycourier/react-editor": path.resolve(
        __dirname,
        "../../packages/react-editor/src/index.ts"
      ),
      "@": path.resolve(__dirname, "../../packages/react-editor/src"),
    },
  },
});
