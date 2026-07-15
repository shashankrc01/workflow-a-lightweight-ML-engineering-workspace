/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#faf9f7",
        surface: "#ffffff",
        ink: "#201d1a",
        "ink-muted": "#6b6560",
        border: "#e7e3dd",
        sidebar: "#15171c",
        "sidebar-hover": "#1e2128",
        "sidebar-text": "#9a9691",
        "sidebar-text-active": "#f5f2ee",
        accent: "#c2703d",
        "accent-hover": "#a95d2f",
        "accent-soft": "#f3e3d6",
        success: "#3a9975",
        "success-soft": "#e2f2ea",
        danger: "#d1453d",
        "danger-soft": "#fbe7e5",
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter",
          "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
        mono: [
          "ui-monospace", "SFMono-Regular", "Menlo", "Consolas",
          "Liberation Mono", "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(32,29,26,0.06), 0 1px 8px rgba(32,29,26,0.04)",
        modal: "0 12px 40px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
