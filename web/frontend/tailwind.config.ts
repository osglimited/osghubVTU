import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Main colors
        primary: {
          DEFAULT: '#0A1F44',
          foreground: '#F8FAFC',
        },
        accent: {
          DEFAULT: '#F97316',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#16A34A',
          foreground: '#FFFFFF',
        },
        error: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        // Background colors
        background: {
          light: '#F8FAFC',
          dark: '#020617',
        },
        // Text colors
        text: {
          primary: '#0F172A',
          muted: '#64748B',
        },
        // Border colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      // Add custom background images or other utilities if needed
    },
  },
  plugins: [],
}
export default config
