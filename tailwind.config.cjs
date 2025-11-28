/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        beach: {
          sand: '#f8ead8',
          sky: '#c1e7ff',
          sea: '#1fa1c9',
          mint: '#4fd1c5',
          navy: '#0c2d48'
        }
      }
    }
  },
  plugins: []
};
