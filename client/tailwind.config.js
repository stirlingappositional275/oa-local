/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: '#06060e',
          800: '#0a0a18',
          700: '#0f0f22',
          600: '#151530',
          500: '#1c1c3a',
          400: '#28284d',
        },
        glass: {
          light: 'rgba(255,255,255,0.04)',
          medium: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)',
          border: 'rgba(255,255,255,0.06)',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          glow: 'rgba(124,58,237,0.15)',
        },
        success: { DEFAULT: '#34d399', glow: 'rgba(52,211,153,0.15)' },
        danger: { DEFAULT: '#f87171', glow: 'rgba(248,113,113,0.15)' },
        warning: { DEFAULT: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
};
