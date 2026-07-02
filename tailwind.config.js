/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        diary: {
          bg: '#fefefe',
          ink: '#111111',
        },
        y2k: {
          pink: '#ff6eb4',
          'pink-light': '#ffb6d9',
          blue: '#3b8bff',
          board: '#2d2d2d',
          'board-post': '#3a3a3a',
        },
      },
      fontFamily: {
        sans: ['"Gothic A1"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
        mono: ['"VT323"', 'Courier New', 'monospace'],
      },
      boxShadow: {
        hard: '4px 4px 0 0 #000000',
        'hard-sm': '2px 2px 0 0 #000000',
      },
    },
  },
  plugins: [],
};
