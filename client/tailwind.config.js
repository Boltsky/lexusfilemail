/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f7',
          500: '#0e8ce9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b84',
          900: '#0c3f6e',
          950: '#082849',
        },
        navy: {
          800: '#0f172a',
          900: '#0b1120',
          950: '#060a12',
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 20px 50px -12px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.03)',
        'luxury-hover': '0 25px 60px -15px rgba(2, 111, 199, 0.15), 0 0 1px 1px rgba(2, 111, 199, 0.1)',
      }
    },
  },
  plugins: [],
}
