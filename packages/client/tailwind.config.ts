import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 全部映射到 styles.css 中定义的 CSS 变量，保证令牌单一来源
        shell: 'var(--shell-ink)',
        surface: {
          DEFAULT: 'var(--surface)',
          solid: 'var(--surface-solid)',
          inset: 'var(--surface-inset)',
          raised: 'var(--surface-raised)'
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)'
        },
        sky: {
          DEFAULT: 'var(--sky)',
          soft: 'var(--sky-soft)'
        },
        success: 'var(--success)',
        danger: 'var(--danger)',
        ink: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)'
        },
        dusk: 'var(--dusk)',
        // 战机糖果色：内容色，不作为界面强调色
        candy: {
          cyan: '#22D3EE',
          amber: '#F59E0B',
          violet: '#A78BFA',
          green: '#34D399',
          rose: '#FB7185'
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        title: ['var(--font-title)'],
        sans: ['var(--font-body)'],
        label: ['var(--font-label)'],
        mono: ['var(--font-mono)']
      },
      boxShadow: {
        glow: '0 0 24px rgba(232, 163, 61, 0.28)',
        panel: '0 18px 40px rgba(0, 0, 0, 0.45)'
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
