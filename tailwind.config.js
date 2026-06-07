/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL: Ensure this points to your app directory
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Adding your "AURA" colors here makes "vibe coding" easier
        neonCyan: "#00D9FF",
        neonPurple: "#8A2BE2",
      },
    },
  },
  plugins: [],
};
