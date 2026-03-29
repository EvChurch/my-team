"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTRPC } from "@mt/api/client";
import { useMutation, useQuery } from "@tanstack/react-query";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  const trpc = useTRPC();

  // Fetch server preference on mount and reconcile
  const { data: serverTheme } = useQuery(trpc.preferences.getTheme.queryOptions());

  // Reconcile server theme preference with local — only when server data arrives
  // and local has no stored preference (new device)
  if (serverTheme) {
    const mapped = serverTheme.toLowerCase() as Theme;
    const localTheme =
      typeof window !== "undefined"
        ? localStorage.getItem("theme")
        : null;
    if (!localTheme && theme !== mapped) {
      setThemeState(mapped);
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", mapped);
        applyTheme(mapped);
      }
    }
  }

  const { mutate: saveTheme } = useMutation(
    trpc.preferences.setTheme.mutationOptions()
  );

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
      saveTheme({ theme: newTheme.toUpperCase() as "LIGHT" | "DARK" | "SYSTEM" });
    },
    [saveTheme]
  );

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for OS preference changes when theme is "system"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
