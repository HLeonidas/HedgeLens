/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', 'serif'],
      },
      colors: {
        ink: {
          950: '#0b1118',
          900: '#101826',
          800: '#1a2332',
          700: '#263248',
        },
        tide: {
          50: '#edf7f7',
          100: '#d3ecec',
          300: '#77b8c1',
          500: '#2f8e9c',
          700: '#1f5f69',
        },
        ember: {
          200: '#ffe0b5',
          400: '#ff9a3c',
          600: '#e06314',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(119,184,193,0.25), 0 12px 32px rgba(11,17,24,0.55)',
      },
    },
  },
  plugins: [],
}
