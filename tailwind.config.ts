import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bfd2ff',
          300: '#93b4ff',
          400: '#608bff',
          500: '#3b67ff',
          600: '#1f4ef5',
          700: '#173ddb',
          800: '#1833b0',
          900: '#1a308a',
        },
        line: '#06C755',
        telegram: '#229ED9',
        deal: '#E8590C',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang TC"',
          '"Noto Sans TC"',
          '"Microsoft JhengHei"',
          '"微軟正黑體"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
