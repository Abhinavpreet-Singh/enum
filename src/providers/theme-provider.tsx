"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === "dark";

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  root.style.backgroundColor = isDark ? "#000000" : "#ffffff";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    return savedTheme === "dark" ? "dark" : "light";
  });

  useLayoutEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.classList.add("theme-transitioning");
      
      applyTheme(newTheme);
      setTheme(newTheme);
      
      setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 250);
    } else {
      applyTheme(newTheme);
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
