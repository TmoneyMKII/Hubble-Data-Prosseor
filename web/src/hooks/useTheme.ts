"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "hubble-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * The theme lives on `<html data-theme>`, written before paint by the inline
 * script in `layout.tsx`. This subscribes to that attribute (and to the system
 * preference behind it) instead of keeping a second copy in React state.
 */
function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  const observer = new MutationObserver(onChange);
  media.addEventListener("change", onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function getSnapshot(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

// The server cannot know the visitor's preference; the inline script corrects
// the attribute before the first paint.
const getServerSnapshot = (): Theme => "light";

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private-mode browsers can refuse storage; the toggle still works.
    }
  }, []);

  return { theme, toggle };
}
