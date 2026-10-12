/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sigap: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfd',
          300: '#7cc1fa',
          400: '#36a0f6',
          500: '#0c82eb',
          600: '#0267c8',
          700: '#0252a2',
          800: '#064685',
          900: '#0b3c6f',
          950: '#07264a',
        },
      },
    },
  },
  plugins: [],
}
