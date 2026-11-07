import type { Config } from "tailwindcss";

// Cores vêm de variáveis CSS (globals.css) para trocar a paleta por unidade:
// JOPE (geral/menu), INOVA (filtro INOVA BH) e SAÚDE (filtro SAÚDE BH).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-sans)", "Open Sans", "system-ui", "sans-serif"] },
      colors: {
        jope: { roxo: "#6F3B8C", azul: "#3266AF", agua: "#12A9A2", cinza: "#737373" },
        inova: { escuro: "#0D5A55", claro: "#95C11F", cinza: "#706F6F" },
        saude: { roxo: "#6E368C", lilas: "#4C2C84", cinza: "#4D4D4D" },
        brand: { DEFAULT: v("brand-1"), 2: v("brand-2"), 3: v("brand-3"), muted: v("brand-muted") },
        bg: v("bg"),
        card: v("card"),
        line: v("line"),
        ink: { DEFAULT: v("ink"), soft: v("ink-soft") },
      },
      borderRadius: { card: "14px" },
      boxShadow: { card: "0 1px 2px rgb(0 0 0 / .04), 0 4px 16px rgb(0 0 0 / .04)" },
    },
  },
  plugins: [],
} satisfies Config;
