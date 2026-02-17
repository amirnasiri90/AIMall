import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 8px)',
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'glass': '0 1px 2px hsl(var(--glass-shadow)), 0 8px 24px hsl(var(--glass-shadow)), inset 0 1px 0 hsl(0 0% 100% / 0.08)',
        'glass-lg': '0 2px 4px hsl(var(--glass-shadow)), 0 16px 40px hsl(var(--glass-shadow)), inset 0 1px 0 hsl(0 0% 100% / 0.1)',
        'glass-sm': '0 1px 2px hsl(var(--glass-shadow)), inset 0 1px 0 hsl(0 0% 100% / 0.06)',
      },
      backdropBlur: {
        'glass': 'var(--glass-blur)',
        'glass-heavy': 'var(--glass-blur-heavy)',
      },
      animation: {
        'mesh': 'mesh-move 30s ease-in-out infinite alternate',
        'glass-shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
