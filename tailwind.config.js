/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // FxD Brand Colors
        primary: {
          DEFAULT: '#0f172a', // Deep Dark Navy (Matches the F and D)
          hover: '#1e293b',   // Slightly lighter navy for hover states
        },
        secondary: {
          DEFAULT: '#00c4b4', // Vibrant Teal (Matches the X and WORK)
          hover: '#00a89a',   // Darker teal for hover states
        },
      },
    },
  },
  plugins: [],
}