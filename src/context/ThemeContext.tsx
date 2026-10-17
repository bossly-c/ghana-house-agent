"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type AppTheme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("gha_theme") as AppTheme) ?? "system";
    setThemeState(saved);
    applyTheme(saved);

    // Listen for system preference changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSysChange = () => {
      if ((localStorage.getItem("gha_theme") ?? "system") === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", onSysChange);
    return () => mq.removeEventListener("change", onSysChange);
  }, []);

  function applyTheme(t: AppTheme) {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.toggle("dark", prefersDark);
    }
  }

  const setTheme = (t: AppTheme) => {
    localStorage.setItem("gha_theme", t);
    setThemeState(t);
    applyTheme(t);
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);