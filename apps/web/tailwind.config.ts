import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Design tokens mapped from CSS variables (theme-switchable)
      colors: {
        primary:   'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        accent:    'var(--color-accent)',
        surface:   'var(--color-surface)',
        border:    'var(--color-border)',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm:  '8px',
        md:  '12px',
        lg:  '20px',
        xl:  '28px',
      },
      boxShadow: {
        card: '0 4px 14px rgba(0,0,0,0.09)',
        dark: '0 8px 28px rgba(0,0,0,0.4)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      spacing: {
        // 8px base grid
        '1': '8px',
        '2': '16px',
        '3': '24px',
        '4': '32px',
        '6': '48px',
        '8': '64px',
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
