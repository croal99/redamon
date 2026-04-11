/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Courier New", "monospace"],
        sans: ["Roboto", "sans-serif"],
      },
      colors: {
        cyber: {
          bg: "#0A0E1A",
          bg2: "#111827",
          bg3: "#1A2235",
          terminal: "#000000",
          cyan: "#00D4FF",
          blue: "#0A84FF",
          "blue-dark": "#0040AA",
          green: "#00FF88",
          "terminal-green": "#00FF41",
          red: "#FF4757",
          orange: "#FF6B35",
          yellow: "#FFD700",
          purple: "#7C3AED",
          text: "#E2E8F0",
          muted: "#64748B",
          border: "rgba(0, 212, 255, 0.2)",
          "glow-cyan": "rgba(0, 212, 255, 0.3)",
          "glow-blue": "rgba(10, 132, 255, 0.3)",
        },
      },
      boxShadow: {
        "cyber-cyan": "0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.1)",
        "cyber-blue": "0 0 20px rgba(10, 132, 255, 0.3)",
        "cyber-red": "0 0 20px rgba(255, 71, 87, 0.4)",
        "cyber-green": "0 0 20px rgba(0, 255, 136, 0.3)",
      },
      backgroundImage: {
        "cyber-gradient": "linear-gradient(135deg, #00D4FF, #0A84FF)",
        "cyber-gradient-dark": "linear-gradient(135deg, #0A0E1A, #111827)",
        "grid-pattern": "linear-gradient(rgba(0,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.05) 1px, transparent 1px)",
      },
      animation: {
        "pulse-cyan": "pulse-cyan 2s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "scan-line": "scan-line 3s linear infinite",
        "breathing": "breathing 3s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
      },
      keyframes: {
        "pulse-cyan": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 212, 255, 0.5)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.9), 0 0 40px rgba(0, 212, 255, 0.5)" },
        },
        glow: {
          from: { textShadow: "0 0 5px #00D4FF, 0 0 10px #00D4FF" },
          to: { textShadow: "0 0 10px #00D4FF, 0 0 20px #00D4FF, 0 0 40px #00D4FF" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        breathing: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
