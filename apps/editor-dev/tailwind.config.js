/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/react-designer/src/**/*.{js,ts,jsx,tsx,css}",
    "../../packages/react-designer/dist/styles.css",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
