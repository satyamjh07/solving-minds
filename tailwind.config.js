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
        background: 'var(--bg)',
        foreground: 'var(--text)',
        muted: {
          DEFAULT: 'var(--bg2)',
          foreground: 'var(--text2)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--text)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--bg)',
        },
        purple: 'var(--purple)',
        green: 'var(--green)',
        orange: 'var(--orange)',
        red: 'var(--red)',
        yellow: 'var(--yellow)',
        bg: {
          1: 'var(--bg)',
          2: 'var(--bg2)',
          3: 'var(--bg3)',
        },
        border: 'var(--border)',
      },
    },
  },
  plugins: [],
};
