/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("daisyui"),
  ],
  daisyui: {
    themes: ["light", "dark", "cyberpunk", "synthwave"],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: true,
  },
}
