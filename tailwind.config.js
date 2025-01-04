/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      animation: {
        'float-slow': 'floatSlow 30s infinite',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { 
            transform: 'translate(0%, 0%) rotate(0deg) scale(1)',
            opacity: 0.3
          },
          '25%': { 
            transform: 'translate(10%, -10%) rotate(90deg) scale(1.1)',
            opacity: 0.5
          },
          '50%': { 
            transform: 'translate(0%, -20%) rotate(180deg) scale(1)',
            opacity: 0.3
          },
          '75%': { 
            transform: 'translate(-10%, -10%) rotate(270deg) scale(0.9)',
            opacity: 0.5
          }
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

