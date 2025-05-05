const { tailwindExtractor } = require("tailwindcss/lib/lib/purgeUnusedStyles");
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}"
  ],
  theme: {
    extend: {
      colors: {
        'custom-teal': '#00ADB5',
        'custom-gray': '#393E46',
        // Agregar nuestros colores a la configuración principal de colores
        // para que Flowbite los reconozca
        primary: {
          50: '#e6f7f8',
          100: '#cceff1',
          200: '#99dfe2',
          300: '#66cfd4',
          400: '#33bfc5',
          500: '#00ADB5', // Nuestro color custom-teal como primary
          600: '#008a91',
          700: '#00686c',
          800: '#004548',
          900: '#002324'
        },
        secondary: {
          50: '#eaebed',
          100: '#d5d7da',
          200: '#abb0b5',
          300: '#82888f',
          400: '#58616a',
          500: '#393E46', // Nuestro color custom-gray como secondary
          600: '#2e3238',
          700: '#22252a',
          800: '#17191c',
          900: '#0b0c0e'
        }
      },
      zIndex: {
        '60': '60',
        '999': '999',
        '9999': '9999'
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif']
      }
    }
  },
  plugins: [require('flowbite/plugin')],
  darkMode: 'class'
};
