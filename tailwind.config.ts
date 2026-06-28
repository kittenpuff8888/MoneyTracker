import type { Config } from "tailwindcss";

const config: Config = {
  // Theme switches via the data-theme attribute on <html> (matches v2 reference)
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Tailwind utilities resolve to the same v2 hex vars used by the
        // inline-styled reference components — one token set, data-theme switch.
        background: "var(--frame)",
        frame: "var(--frame)",
        foreground: "var(--text)",
        card: "var(--panel)",
        panel: "var(--panel)",
        border: "var(--border)",
        hair: "var(--hair)",
        muted: "var(--soft)",
        soft: "var(--soft)",
        softer: "var(--softer)",
        "muted-foreground": "var(--muted)",
        faint: "var(--faint)",
        ink: "var(--ink)",
        primary: "var(--accent)",
        "primary-foreground": "var(--panel)",
        accent: "var(--accent)",
        success: "var(--up)",
        up: "var(--up)",
        down: "var(--down)",
        warning: "var(--warn)",
        danger: "var(--down)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Newsreader", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11, 14, 20, 0.05)",
        card: "0 1px 2px rgba(11, 14, 20, 0.05)"
      },
      borderRadius: {
        panel: "16px",
        r2: "12px",
        xl2: "26px"
      }
    }
  },
  plugins: []
};

export default config;
