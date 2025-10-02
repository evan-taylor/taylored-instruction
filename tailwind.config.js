/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        primary: {
          DEFAULT: "hsl(var(--primary))",
          dark: "#163f69",
          foreground: "hsl(var(--primary-foreground))",
        },
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        text: {
          DEFAULT: "#1a202c",
          light: "#2d3748",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // biome-ignore lint/style/useNamingConvention: DEFAULT is a Tailwind convention
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        readex: [
          "var(--font-readex)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
