import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-urbanist)", "Urbanist", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        base: "#08090a",
        surface: {
          DEFAULT: "#0f1011",
          raised: "#191a1b",
        },
        accent: {
          DEFAULT: "#0066FF",
          hover: "#3385FF",
        },
        text: {
          primary: "#f7f8f8",
          secondary: "#d0d6e0",
          muted: "#8a8f98",
          faint: "#62666d",
        },
        border: {
          DEFAULT: "#2a2b2c",
          subtle: "#1e1f20",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
