/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Saffron primary family
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Saffron
          600: '#e58a1f', // Warm rich saffron
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        saffron: {
          50: '#fff9ed',
          100: '#ffeed5',
          200: '#fed7aa',
          300: '#fdb974',
          400: '#fb923c',
          500: '#f59e0b',
          600: '#ea580c',
          700: '#c2410c',
        },
        // Clay brown & cream palette
        clay: {
          darkest: '#140c07', // Deepest background
          dark: '#1c120a',    // Background canvas
          surface: '#26190f', // Card base
          elevated: '#332216', // Elevated card / hovered
          highlight: '#442e20', // Border / soft highlight
          caramel: '#8c593b',
          taupe: '#bfa08a',
          sand: '#dfccbd',
          beige: '#ede2d7',
          cream: '#fdf8f0',   // Light cream
          lightCard: '#fffaf3',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'clay-card': '8px 12px 24px -4px rgba(10, 6, 3, 0.7), -4px -4px 14px 0px rgba(245, 158, 11, 0.05), inset 1px 1px 2px rgba(255, 235, 204, 0.12), inset -2px -2px 4px rgba(10, 5, 2, 0.5)',
        'clay-card-light': '8px 14px 24px -4px rgba(60, 36, 18, 0.12), -4px -4px 14px 0px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(60, 36, 18, 0.04)',
        'clay-btn': '0 6px 16px -2px rgba(229, 138, 31, 0.45), inset 0 1.5px 2px rgba(255, 255, 255, 0.4), inset 0 -2px 3px rgba(120, 53, 15, 0.4)',
        'clay-btn-hover': '0 8px 22px -2px rgba(229, 138, 31, 0.6), inset 0 1.5px 2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(120, 53, 15, 0.4)',
        'clay-btn-active': '0 2px 6px -1px rgba(229, 138, 31, 0.35), inset 0 2px 4px rgba(120, 53, 15, 0.5)',
        'clay-btn-sec': '0 4px 12px -2px rgba(15, 9, 4, 0.5), inset 0 1px 1.5px rgba(255, 235, 210, 0.08), inset 0 -1.5px 2px rgba(15, 9, 4, 0.4)',
        'clay-inset': 'inset 2px 3px 6px rgba(10, 5, 2, 0.6), inset -1px -1px 3px rgba(245, 158, 11, 0.05), 0 1px 2px rgba(255, 255, 255, 0.03)',
        'clay-pill': '4px 6px 12px -2px rgba(10, 6, 3, 0.5), inset 1px 1px 1px rgba(255, 235, 204, 0.1)',
      }
    },
  },
  plugins: [],
}
