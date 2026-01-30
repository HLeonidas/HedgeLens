/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
      },
      colors: {
        primary: '#0f172a',
        accent: '#2563eb',
        'curve-a': '#2563eb',
        'curve-b': '#9333ea',
        'surface-grey': '#f8fafc',
        'border-light': '#e2e8f0',
        'background-light': '#ffffff',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
