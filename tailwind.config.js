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
        // Primary theme colors
        'primary-bg': '#121212',
        'accent': '#FF6B00',
        'highlight-chip': '#FDCB6E',
        'text-main': '#FFFFFF',
        'placeholder-subtext': '#CCCCCC',
        'card-bg': 'rgba(255,255,255,0.05)',
        'divider-border': '#2C2C2C',
        'hover-shade': '#D93217',
        'primary': '#121212',
        
        // Theme-aware CSS custom properties
        'theme': {
          'bg': {
            'primary': 'var(--bg-primary)',
            'secondary': 'var(--bg-secondary)',
            'tertiary': 'var(--bg-tertiary)',
            'card': 'var(--bg-card)',
            'hover': 'var(--bg-hover)',
          },
          'text': {
            'primary': 'var(--text-primary)',
            'secondary': 'var(--text-secondary)',
            'tertiary': 'var(--text-tertiary)',
            'inverse': 'var(--text-inverse)',
          },
          'border': {
            'primary': 'var(--border-primary)',
            'secondary': 'var(--border-secondary)',
            'accent': 'var(--border-accent)',
          },
          'accent': {
            'primary': 'var(--accent-primary)',
            'secondary': 'var(--accent-secondary)',
            'hover': 'var(--accent-hover)',
          }
        }
      },
      fontFamily: {
        fredoka: ['Fredoka', 'cursive'],
        raleway: ['Raleway', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
      },
      fontWeight: {
        'fredoka-light': '300',
        'fredoka-normal': '400',
        'fredoka-medium': '500',
        'fredoka-semibold': '600',
      },
      keyframes: {
        shine: {
          '100%': { left: '125%' },
        },
      },
      animation: {
        shine: 'shine 1.2s ease-in-out infinite',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      borderWidth: {
        '3': '3px',
      },
      minWidth: {
        'fit': 'fit-content',
      },
    },
  },
  // Production optimizations
  corePlugins: {
    // Disable unused features for smaller bundle
    preflight: true,
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.pb-safe': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}
