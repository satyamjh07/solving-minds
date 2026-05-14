/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        display: ['Bebas Neue', 'sans-serif'],
      },
      colors: {
        accent: '#00f0ff',
        purple: '#b06aff',
        green: '#00e5a0',
        orange: '#ff9340',
        red: '#ff4d6a',
        yellow: '#ffd060',
        bg: {
          1: '#0a0a10',
          2: '#111118',
          3: '#18181f',
        },
        border: 'rgba(255,255,255,0.07)',
      },
    },
  },
  plugins: [],
};
