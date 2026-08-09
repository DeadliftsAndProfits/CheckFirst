import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Check First brand palette — trustworthy, premium, approachable.
        ink: {
          DEFAULT: "#0f172a",
          soft: "#1e293b",
          muted: "#475569",
        },
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcddff",
          300: "#8ec7ff",
          400: "#59a6ff",
          500: "#2f83f7",
          600: "#1a63e0",
          700: "#164ec0",
          800: "#17429b",
          900: "#183a7a",
        },
        trust: {
          // supporting teal/green used for "verified" affordances
          500: "#0d9488",
          600: "#0f766e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -12px rgba(15,23,42,0.18)",
        lift: "0 2px 4px rgba(15,23,42,0.06), 0 24px 48px -20px rgba(15,23,42,0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
