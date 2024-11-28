/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  safelist: ["ProseMirror"],
  //   safelist: [{ pattern: /.*/ }],
  //   purge: false,
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
};
