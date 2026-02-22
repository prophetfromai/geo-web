/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edfcf2",
          100: "#d3f8e0",
          200: "#aaefc6",
          300: "#73e2a3",
          400: "#3acd7c",
          500: "#16b362",
          600: "#0a914e",
          700: "#087440",
          800: "#095c35",
          900: "#084c2d",
          950: "#032b19",
        },
      },
    },
  },
  plugins: [],
};
