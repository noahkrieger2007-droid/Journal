/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        nova: {
          bg: "#0A0F1E",
          card: "#141829",
          "card-2": "#1A2035",
          violet: "#7C3AED",
          "violet-light": "#9D5FF3",
          amber: "#F59E0B",
          "amber-light": "#FCD34D",
          text: "#FFFFFF",
          muted: "#64748B",
          subtle: "#94A3B8",
          border: "#1E2A45",
          success: "#22C55E",
          danger: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
