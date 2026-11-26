import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          background: '#0B1220',
          panel: '#111C2E',
          cyan: '#22D3EE',
          amber: '#F59E0B',
          violet: '#6366F1',
          text: '#F8FAFC',
          muted: '#94A3B8'
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Consolas"', 'monospace']
      },
      boxShadow: {
        glow: '0 0 24px rgba(34, 211, 238, 0.28)',
        amber: '0 0 24px rgba(245, 158, 11, 0.25)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.65' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        'fade-up': 'fade-up 300ms ease-out both',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite'
      }
    }
  },
  plugins: [animate]
} satisfies Config;
