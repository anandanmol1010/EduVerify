/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        edu: {
          primary: '#254D3C', // Deep forest green
          primaryHover: '#1c3b2e',
          accent: '#B18B56',  // Muted bronze
          accentHover: '#987544',
          bg: '#F7F6F2',      // Warm ivory
          surface: '#FFFFFF', // Clean off-white
          text: '#252824',    // Charcoal
          muted: '#6B716C',   // Muted grey
          border: '#DDDCD5',  // Soft warm grey
          borderLight: '#ECEBE4',
          subtle: '#EFEFEA',
          success: '#2B6E4E',
          warning: '#B47B1E',
          danger: '#9E2A2B',
          info: '#3B6B78'
        }
      },
      fontFamily: {
        serif: ['"Libre Baskerville"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '6px',
        'lg': '8px',
      }
    },
  },
  plugins: [],
}
