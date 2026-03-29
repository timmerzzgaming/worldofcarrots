import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Comic "World Of Carrots" palette — bright, bold, happy
        geo: {
          bg: '#FFF8E7',              // warm cream background
          surface: '#FFFFFF',          // white panels
          'surface-high': '#FFF3D6',   // warm highlight surface
          'surface-highest': '#FFE8B0', // golden surface
          primary: '#FF6B35',          // bold orange (carrot orange)
          'primary-dim': '#E55A28',    // darker orange
          'primary-container': '#FF8C42', // lighter carrot
          'on-primary': '#FFFFFF',     // white text on orange
          secondary: '#4ECDC4',        // teal/cyan
          'secondary-dim': '#3DBDB5',  // darker teal
          tertiary: '#FFD93D',         // bright yellow
          'tertiary-bright': '#FFE066', // lighter yellow
          'on-tertiary': '#5A4000',    // dark text on yellow
          error: '#FF6B6B',            // coral red
          'error-dim': '#E05555',      // darker red
          accent: '#A855F7',           // purple accent
          success: '#4ADE80',          // bright green
          outline: '#D4C5A0',          // warm outline
          'outline-dim': '#E8DCC8',    // light warm outline
          'on-surface': '#2D2D2D',     // near-black text
          'on-surface-dim': '#7A7060', // muted brown text
        },

        // Continent colors for map
        continent: {
          africa: '#FFD93D',      // bright yellow
          americas: '#4ECDC4',    // teal
          asia: '#FF6B6B',        // coral
          europe: '#A855F7',      // purple
          oceania: '#4ADE80',     // green
          antarctica: '#94A3B8',  // gray
        },
      },
      fontFamily: {
        headline: ['var(--font-fredoka)', 'Fredoka', 'sans-serif'],
        body: ['var(--font-nunito)', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '3rem',
      },
      boxShadow: {
        'comic': '4px 4px 0 #2D2D2D',
        'comic-sm': '2px 2px 0 #2D2D2D',
        'comic-lg': '6px 6px 0 #2D2D2D',
        'comic-hover': '6px 6px 0 #2D2D2D',
        'comic-active': '1px 1px 0 #2D2D2D',
      },
    },
  },
  plugins: [],
}
export default config
