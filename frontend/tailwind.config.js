/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAF8F3',
          100: '#F5F3EB',
          200: '#F1EEE3', // Exact background from slides
          300: '#EAE5D6', // Cream-yellow interactive card highlight
          400: '#DFD8C4',
        },
        slateTeal: {
          50: '#F2F8F7',
          100: '#E4EFF0',
          200: '#CFE3E0', // Light Slate Teal card highlight
          300: '#A9CCC8',
          400: '#75A9A3',
          500: '#4F8882',
          600: '#346A66',
          700: '#235250',
          800: '#1C4A57', // Main Accent & Text from slides
          900: '#143741', // Dark Navy Slate Header
          950: '#0C2229',
        },
        coralAlert: {
          DEFAULT: '#D95D39', // Low readiness / critical gap alert from Slide 07
          light: '#FDEAE5',
          dark: '#B84524'
        },
        sageSuccess: {
          DEFAULT: '#2E7D68', // High readiness / verified skill from Slide 07
          light: '#E6F4F0',
          dark: '#1E5848'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
