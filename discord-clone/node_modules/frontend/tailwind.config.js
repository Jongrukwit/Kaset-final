/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          // Backgrounds
          'bg-primary': '#313338',
          'bg-secondary': '#2b2d31',
          'bg-tertiary': '#1e1f22',
          'bg-accent': '#404249',
          'bg-hover': '#35373c',
          // Sidebar
          'sidebar': '#2b2d31',
          'server-list': '#1e1f22',
          // Text
          'text-normal': '#dbdee1',
          'text-muted': '#949ba4',
          'text-link': '#00a8fc',
          // Interactive
          'interactive-normal': '#b5bac1',
          'interactive-hover': '#dbdee1',
          'interactive-active': '#ffffff',
          // Brand
          'brand': '#5865f2',
          'brand-hover': '#4752c4',
          // Status
          'online': '#23a55a',
          'idle': '#f0b232',
          'dnd': '#f23f43',
          'offline': '#80848e',
          // Other
          'danger': '#f23f43',
          'success': '#23a55a',
          'warning': '#f0b232',
          'channel-text': '#949ba4',
          'channel-hover': '#dbdee1',
        }
      },
      fontFamily: {
        discord: ['gg sans', 'Noto Sans', 'Whitney', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
