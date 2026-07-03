/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/index.css', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        diary: {
          bg: '#fffdf8',
          ink: '#4a3f55',
          paper: '#fffdf8',
          table: '#fbf6ee',
        },
        pencil: {
          bold: '#8b7a9e',
          medium: '#b5a3c9',
          light: '#d4c8e4',
          faint: '#ebe4f4',
        },
        pastel: {
          blush: '#ffd3e2',
          mint: '#d8f3dc',
          sky: '#c5e5fc',
          peach: '#ffe4c4',
          lavender: '#e8dff8',
        },
        y2k: {
          pink: '#e8a4c4',
          'pink-light': '#ffd3e2',
          blue: '#9ec5e8',
          board: '#f5f0ff',
          'board-post': '#fffdf8',
        },
      },
      fontFamily: {
        sans: ['"Playpen Sans"', 'system-ui', 'sans-serif'],
        playpen: ['"Playpen Sans"', 'system-ui', 'sans-serif'],
        playwrite: ['"Playwrite VN"', 'cursive'],
        phudu: ['"Phudu"', '"Playpen Sans"', 'sans-serif'],
        doodle: ['"Playpen Sans"', 'system-ui', 'sans-serif'],
        spy: ['"Phudu"', '"Playpen Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
