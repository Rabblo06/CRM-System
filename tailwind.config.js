/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // HubSpot Calypso Design System
        'hs-orange': '#FF7A59',
        'hs-orange-dark': '#E8674A',
        'hs-navy': '#2D3E50',
        'hs-navy-light': '#3D5166',
        'hs-breeze': '#425B76',
        'hs-sky': '#7C98B6',
        'hs-light': '#F6F9FC',
        'hs-border': '#DFE3EB',
        'hs-muted': '#F0F3F7',
        'hs-success': '#00BDA5',
        'hs-warning': '#F5C26B',
        'hs-danger': '#F2545B',
        'hs-info': '#4FC3F7',
        // Text hierarchy
        'hs-text-primary': '#2D3E50',
        'hs-text-secondary': '#516F90',
        'hs-text-muted': '#7C98B6',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '18px'],
        base: ['13px', '20px'],
        md: ['14px', '20px'],
      },
    },
  },
  plugins: [],
};
