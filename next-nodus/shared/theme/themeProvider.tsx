"use client";

import { createContext, use, useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { DEFAULT_THEME_MODE, THEME_COOKIE, THEME_COOKIE_MAX_AGE, isThemeMode, type ThemeMode } from "./tokens";

type ThemeContextValue = {
  mode: ThemeMode;
  // `origin` (e.g. the toggle button) is where the new theme starts spreading from.
  setMode: (mode: ThemeMode, origin?: Element) => void;
};

type ThemeProviderProps = {
  initialMode: ThemeMode;
  children: ReactNode;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// While present on <html>, CSS transitions are off (app/globals.css) so every element switches at once.
const SWITCHING_CLASS = "theme-switching";

const REVEAL_DURATION_MS = 450;

// `data-theme` on <html> is an external store: the head script sets it before hydration (cookie or OS
// preference) and setMode updates it. React reads it with useSyncExternalStore; on the server the cookie value
// is the snapshot, and React re-renders after hydration if the head script picked something else.
const listeners = new Set<() => void>();

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const getThemeMode = (): ThemeMode => {
  const { theme } = document.documentElement.dataset;
  return isThemeMode(theme) ? theme : DEFAULT_THEME_MODE;
};

const storeThemeMode = (mode: ThemeMode) => {
  document.documentElement.dataset.theme = mode;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  listeners.forEach((notify) => notify());
};

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Circular reveal like ant.design: the new theme grows from `origin` until it covers the viewport.
const revealFrom = (origin: Element | undefined) => {
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : innerHeight / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: REVEAL_DURATION_MS, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
  );
};

export const ThemeProvider = ({ initialMode, children }: ThemeProviderProps) => {
  const mode = useSyncExternalStore(subscribe, getThemeMode, () => initialMode);

  const setMode = useCallback((next: ThemeMode, origin?: Element) => {
    const root = document.documentElement;
    // flushSync: antd styles (React commit) and Tailwind variables (data-theme) change in the same update.
    const apply = () => flushSync(() => storeThemeMode(next));
    const finish = () => requestAnimationFrame(() => root.classList.remove(SWITCHING_CLASS));

    root.classList.add(SWITCHING_CLASS);

    if (!document.startViewTransition || prefersReducedMotion()) {
      apply();
      finish();
      return;
    }

    const transition = document.startViewTransition(apply);
    transition.ready.then(() => revealFrom(origin));
    transition.finished.finally(finish);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
};

export const useThemeMode = () => {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used inside ThemeProvider");
  }
  return context;
};
