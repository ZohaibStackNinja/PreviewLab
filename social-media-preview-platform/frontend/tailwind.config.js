/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      animation: {
        progress: 'progress 1.5s ease-in-out infinite',
      },
      keyframes: {
        progress: {
          '0%': { width: '0%', marginLeft: '0%' },
          '50%': { width: '50%', marginLeft: '25%' },
          '100%': { width: '0%', marginLeft: '100%' },
        },
      },
    },
    extend: {},
  },
  plugins: [],
};
