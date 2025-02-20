/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#037ffc',
          50: '#f0f7ff',
          100: '#d9ecff',
          200: '#037ffc',
          300: '#0070e6',
          400: '#0061cc',
          500: '#037ffc',
          600: '#0052b3',
          700: '#004299',
          800: '#003380',
          900: '#002966',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};