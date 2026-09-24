import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1B4D3E",
          hover: "#153E32",
          light: "#E8F0EC",
        },
        sand: {
          DEFAULT: "#FBF9F5",
          muted: "#F4EFE6",
        },
        charcoal: {
          DEFAULT: "#1A1D20",
          light: "#5A6065",
        },
        bronze: {
          DEFAULT: "#C27D38",
          hover: "#A8692B",
        },
        amber: {
          DEFAULT: "#C27D38",
          hover: "#A8692B",
        },
        cream: {
          DEFAULT: "#FBF9F5",
        },
        slate: {
          dark: "#111827",
          900: "#111827",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
