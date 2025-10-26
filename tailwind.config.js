/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable dark mode with class strategy
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // TRUE Zoho Books color palette (from screenshots)
        zoho: {
          blue: '#2C7BE5', // Primary blue for links and buttons
          'blue-light': '#E3EBFA', // Light blue for hover/active
          'blue-lighter': '#F0F5FF', // Very light blue
          gray: '#95AAC9', // Secondary text
          'gray-light': '#E3E6F0', // Borders
          'gray-lighter': '#F8F9FC', // Hover backgrounds
          dark: '#12263F', // Primary text
          white: '#FFFFFF', // Pure white backgrounds
          success: {
            50: '#F6FFED',
            100: '#D9F7BE',
            200: '#B7EB8F',
            300: '#95DE64',
            400: '#73D13D',
            500: '#52C41A', // Success green
            600: '#389E0D',
            700: '#237804',
            800: '#135200',
            900: '#092B00',
          },
          warning: {
            50: '#FFF7E6',
            100: '#FFE7BA',
            200: '#FFD591',
            300: '#FFC069',
            400: '#FFA940',
            500: '#FA8C16', // Warning orange
            600: '#D46B08',
            700: '#AD4E00',
            800: '#873800',
            900: '#612500',
          },
          danger: {
            50: '#FFF1F0',
            100: '#FFCCC7',
            200: '#FFA39E',
            300: '#FF7875',
            400: '#FF4D4F',
            500: '#F5222D', // Danger red
            600: '#CF1322',
            700: '#A8071A',
            800: '#820014',
            900: '#5C0011',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'zoho': 'none', // Zoho Books uses NO shadows, only borders
        'zoho-subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03)', // Very subtle if needed
      },
      borderRadius: {
        'zoho': '4px', // Zoho uses subtle 4px radius
        'zoho-sm': '2px',
      },
      spacing: {
        'zoho-xs': '4px',
        'zoho-sm': '8px',
        'zoho-md': '16px',
        'zoho-lg': '24px',
        'zoho-xl': '32px',
        'zoho-2xl': '48px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
