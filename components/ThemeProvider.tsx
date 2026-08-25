"use client";

import { createContext, useContext } from "react";

type ThemeContextValue = {
  theme: "dark";
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
});

export const themeInitScript = `
(function () {
  try {
    document.documentElement.setAttribute("data-theme", "dark");
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "dark", toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}