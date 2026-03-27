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
        // Stitch "Tactile Cartography" palette
        geo: {
          bg: '#060e20',
          surface: '#0f1930',
          'surface-high': '#141f38',
          'surface-highest': '#192540',
          primary: '#6bffc1',
          'primary-dim': '#5af0b4',
          'primary-container': '#04c087',
          'on-primary': '#006042',
          secondary: '#64a8fe',
          'secondary-dim': '#5ba0f5',
          tertiary: '#ffe083',
          'tertiary-bright': '#fed01b',
          'on-tertiary': '#594700',
          error: '#ff716c',
          'error-dim': '#d7383b',
          outline: '#6d758c',
          'outline-dim': '#40485d',
          'on-surface': '#dee5ff',
          'on-surface-dim': '#a3aac4',
        },
      },
      fontFamily: {
        headline: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        body: ['var(--font-vietnam)', 'Be Vietnam Pro', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '3rem',
      },
    },
  },
  plugins: [],
}
export default config
