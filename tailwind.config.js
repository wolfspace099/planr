/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        bg: "#F9F9F7",
        surface: "#FFFFFF",
        sidebar: {
          DEFAULT: "#111110",
          hover: "#1C1C1A",
          border: "#282826",
          text: "#8C8C86",
          active: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E8E7E3",
          strong: "#D4D3CF",
        },
        ink: {
          DEFAULT: "#1A1A17",
          muted: "#6B6B63",
          light: "#9C9C94",
        },
        accent: {
          DEFAULT: "#8B5CF6",
          hover: "#7C3AED",
          light: "#F3E8FF",
          border: "#D8B4FE",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#F0FDF4",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FFFBEB",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FEF2F2",
        },
        subject: {
          math: "#6366F1",
          english: "#EC4899",
          science: "#10B981",
          history: "#F59E0B",
          pe: "#EF4444",
          art: "#8B5CF6",
          default: "#6B7280",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        modal:
          "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        lg: "12px",
        xl: "16px",
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
