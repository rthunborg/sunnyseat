/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0EA5E9', // Sky Blue
        sunny: '#22C55E', // Green
        partial: '#F59E0B', // Amber
        shaded: '#9CA3AF', // Gray
      },
      spacing: {
        // 8pt grid system
      },
      borderRadius: {
        DEFAULT: '16px',
      },
      fontSize: {
        headline: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
