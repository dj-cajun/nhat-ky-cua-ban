/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        doodle: ['Playpen Sans', 'Gaegu', 'Single Day', 'cursive', 'sans-serif'],
        marker: ['Phudu', 'Caveat', 'sans-serif'],
      },
      colors: {
        doodle: {
          beige: '#fcf8eb',
          paper: '#fffdf5',
          blush: '#ffd3e2',
          sky: '#c5e5fc',
          mint: '#d8f3dc',
          ink: '#2e2a25',
        },
      },
      boxShadow: {
        'crayon-pink': '6px 6px 0px 0px #ffd3e2',
        'crayon-blue': '6px 6px 0px 0px #c5e5fc',
        'crayon-mint': '6px 6px 0px 0px #d8f3dc',
        'crayon-peach': '6px 6px 0px 0px #ffe4c4',
        'crayon-sm': '3px 3px 0px 0px #ffd3e2',
        'crayon-active': '1px 1px 0px 0px #2e2a25',
      },
    },
  },
  plugins: [],
};
