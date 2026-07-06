/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mhmr: {
          olive: '#6B8E23',
          'olive-dark': '#556B2F',
          'olive-light': '#8FAF40',
          navy: '#1c4587',
          grey: '#C7CBD1',
          'grey-dark': '#808080',
          'grey-nav': '#DEDEE0',
          bg: '#f5f5f5',
          white: '#ffffff',
        },
        sentiment: {
          verypositive: '#00695C',
          positive: '#2E7D32',
          neutral: '#616161',
          negative: '#E65100',
          verynegative: '#B71C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
