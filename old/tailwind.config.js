/** @type {import('tailwindcss').Config} */
// NOTE: This file is here for reference / future CLI builds.
// Currently the app uses the Tailwind CDN — no build step needed.
// To switch to a compiled build: npm install -D tailwindcss && npx tailwindcss init

module.exports = {
  content: [
    './index.html',
    './src/**/*.{html,js}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f59e0b',  // amber-500
          dark:    '#d97706',  // amber-600
        }
      }
    },
  },
  plugins: [],
};
