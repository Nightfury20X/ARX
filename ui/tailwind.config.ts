import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        arx: {
          ink: "#05070d",
          navy: "#08111f",
          panel: "#0d1626",
          panel2: "#111c2f",
          line: "#22314d",
          blue: "#2563eb",
          cyan: "#38bdf8",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          text: "#f8fafc",
          muted: "#94a3b8"
        }
      },
      boxShadow: {
        "arx-card": "0 18px 80px rgba(3, 7, 18, 0.32)",
        "arx-blue": "0 0 0 1px rgba(37, 99, 235, 0.32), 0 24px 80px rgba(37, 99, 235, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
