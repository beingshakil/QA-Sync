"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_THEME_KEY } from "@/lib/app-theme";

/**
 * Light / dark theme for the app (everything under /app). The marketing site is dark-only, so the
 * choice applies inside the app and the page goes back to dark when you leave it.
 *  - The saved choice lives in localStorage under APP_THEME_KEY (src/lib/app-theme.ts).
 *  - APP_THEME_PREPAINT (same file, run in the root layout's <head>) applies it before first paint.
 *  - <AppThemeSync /> (mounted by the app layout) applies it on client-side entry and restores dark
 *    on the way out.
 *  - <ThemeToggle /> switches and saves it.
 */
export type AppTheme = "dark" | "light";

function apply(theme: AppTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

function saved(): AppTheme {
  try {
    return localStorage.getItem(APP_THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Mounted once by src/app/app/layout.tsx. Layout effect, so the theme is set before paint. */
export function AppThemeSync() {
  useLayoutEffect(() => {
    apply(saved());
    return () => apply("dark");
  }, []);
  return null;
}

export function ThemeToggle({ className, size = 15 }: { className?: string; size?: number }) {
  const [theme, setTheme] = useState<AppTheme>("dark");
  useEffect(() => setTheme(saved()), []);

  function toggle() {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-switching"); // brief colour cross-fade (globals.css)
    apply(next);
    try {
      localStorage.setItem(APP_THEME_KEY, next);
    } catch {}
    setTheme(next);
    window.setTimeout(() => root.classList.remove("theme-switching"), 400);
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" onClick={toggle} title={label} aria-label={label} className={cn("rounded-md p-1.5 text-ink-3 transition hover:text-ink", className)}>
      {theme === "dark" ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
