/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mhmr: {
          // Army Green
          olive: '#4B5320',
          'olive-dark': '#3a4119',
          'olive-light': '#5e6828',
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
