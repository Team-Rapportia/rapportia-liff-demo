import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#C9A961",
        "primary-dark": "#A88842",
        "primary-light": "#E5D5A8",
        accent: "#8B3A3A",
        text: "#3D2F1F",
        bg: "#FAF7F2",
      },
      fontFamily: {
        body: ["Noto Sans JP", "Hiragino Sans", "Yu Gothic", "sans-serif"],
        heading: ["Cormorant Garamond", "Shippori Mincho", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
