/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f7ff',
          100: '#dfeeff',
          200: '#bad9ff',
          300: '#8abfff',
          400: '#559aff',
          500: '#2e75fb',
          600: '#1c56d7',
          700: '#153faf',
          800: '#153283',
          900: '#132b69',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(46, 117, 251, 0.35)'
      }
    },
  },
  plugins: [],
};
