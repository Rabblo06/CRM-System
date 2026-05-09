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
        // Twenty CRM Design System
        'tw-bg': '#FAFAFA',
        'tw-bg-primary': '#FFFFFF',
        'tw-bg-secondary': '#FCFCFC',
        'tw-bg-tertiary': '#F1F1F1',
        'tw-bg-quaternary': '#EBEBEB',

        // Borders
        'tw-border': '#EBEBEB',
        'tw-border-strong': '#D6D6D6',
        'tw-border-light': '#F1F1F1',

        // Text
        'tw-text': '#333333',
        'tw-text-secondary': '#666666',
        'tw-text-tertiary': '#999999',
        'tw-text-light': '#B3B3B3',

        // Accent (indigo-blue)
        'tw-accent': '#4762D5',
        'tw-accent-hover': '#3A52C0',
        'tw-accent-light': '#EEF0FB',

        // Status
        'tw-success': '#4CAF8E',
        'tw-warning': '#E8882A',
        'tw-danger': '#D45353',
        'tw-info': '#4762D5',
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
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        xl: '20px',
        xxl: '40px',
      },
      boxShadow: {
        'tw-light': '0px 2px 4px 0px rgba(0,0,0,0.04), 0px 0px 4px 0px rgba(0,0,0,0.08)',
        'tw-strong': '2px 4px 16px 0px rgba(0,0,0,0.16), 0px 2px 4px 0px rgba(0,0,0,0.08)',
        'tw-super': '0px 0px 8px 0px rgba(0,0,0,0.16), 0px 8px 64px -16px rgba(0,0,0,0.48)',
      },
    },
  },
  plugins: [],
};
