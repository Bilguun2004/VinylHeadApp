/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // TODO(design.md): Move these into design.md once it exists and mirror
      // tokens here as semantic names (e.g. `bg-background`, `text-foreground`).
      // For now, hard-coded "Vinyl Black" aesthetic values inferred from the
      // login mockup.
      colors: {
        'vinyl-black': '#0A0A0A',
        'vinyl-ink': '#111111',
        'vinyl-paper': '#FFFFFF',
        'vinyl-muted': '#6B6B6B',
        'vinyl-input': '#F7E9E5',
        'vinyl-divider': '#E5E5E5',
        'vinyl-canvas': '#F9F7F7',
        'vinyl-surface': '#F8F8F8',
        'vinyl-sale': '#8B1A1A',
        'vinyl-confirmed': '#16A34A',
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
