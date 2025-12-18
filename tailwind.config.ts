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
        primary: '#0A1F44',
        accent: '#F97316',
        success: '#16A34A',
        error: '#DC2626',
        'text-muted': '#64748B',
      },
    },
  },
  plugins: [],
}
export default config
