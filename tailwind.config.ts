import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Text / ink — deep navy for authority.
        ink: {
          DEFAULT: "#0b1526",
          soft: "#233247",
          muted: "#5a6b82",
          faint: "#8698ae",
        },
        // Dark surfaces (hero glow, intelligence section, footer).
        navy: {
          950: "#050a15",
          900: "#08111f",
          850: "#0c1a2e",
          800: "#112339",
          700: "#1b3251",
          600: "#274364",
        },
        // Primary — electric blue.
        brand: {
          50: "#eff5ff",
          100: "#dbe8fe",
          200: "#bfd6fe",
          300: "#93bbfd",
          400: "#6096fa",
          500: "#3b74f6",
          600: "#2563eb",
          700: "#1d4fd7",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Accent — teal / aqua (the "verified / signal" hue).
        accent: {
          50: "#effcf9",
          100: "#c9f7ee",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
        },
        // Kept for existing "verified" affordances in results.
        trust: {
          500: "#0d9488",
          600: "#0f766e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(9,17,31,0.04), 0 6px 20px -10px rgba(9,17,31,0.14)",
        card: "0 1px 2px rgba(9,17,31,0.04), 0 12px 34px -14px rgba(9,17,31,0.20)",
        lift: "0 2px 6px rgba(9,17,31,0.06), 0 34px 64px -28px rgba(9,17,31,0.34)",
        glow: "0 24px 70px -24px rgba(37,99,235,0.42)",
        "glow-accent": "0 24px 70px -24px rgba(20,184,166,0.40)",
        ring: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        "grid-navy":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "expand-down": {
          "0%": { opacity: "0", transform: "translateY(-6px)", maxHeight: "0" },
          "100%": { opacity: "1", transform: "translateY(0)", maxHeight: "1200px" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-node": {
          "0%,100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "expand-down": "expand-down 0.28s cubic-bezier(0.22,1,0.36,1)",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
