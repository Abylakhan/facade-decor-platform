"use client";
/**
 * Small client stores over browser storage: favorites, comparison, current project.
 * Projects themselves go through ProjectProvider (BrowserProjectProvider in DEMO).
 */
import { useCallback, useSyncExternalStore } from "react";
import { safeStorage } from "./storage";

function subscribe(cb: () => void) {
  const h = () => cb();
  window.addEventListener("storage", h);
  window.addEventListener("fd-storage", h);
  return () => {
    window.removeEventListener("storage", h);
    window.removeEventListener("fd-storage", h);
  };
}

const cache = new Map<string, { raw: string | null; value: string[] }>();
const EMPTY: string[] = [];

function readList(key: string): string[] {
  const raw = safeStorage().getItem(key);
  const c = cache.get(key);
  if (c && c.raw === raw) return c.value;
  let value: string[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache.set(key, { raw, value });
  return value;
}

export function useStoredList(key: string, max = 100) {
  const list = useSyncExternalStore(subscribe, () => readList(key), () => EMPTY);
  const set = useCallback((next: string[]) => safeStorage().setItem(key, JSON.stringify(next.slice(-max))), [key, max]);
  const toggle = useCallback(
    (id: string) => {
      const cur = readList(key);
      if (cur.includes(id)) {
        set(cur.filter((x) => x !== id));
        return false;
      }
      if (cur.length >= max) return null;
      set([...cur, id]);
      return true;
    },
    [key, max, set],
  );
  return { list, has: (id: string) => list.includes(id), toggle, set };
}

export const useFavorites = () => useStoredList("fd.favorites", 100);
export const useCompare = () => useStoredList("fd.compare", 4);

export function useStoredValue(key: string): [string | null, (v: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => safeStorage().getItem(key),
    () => null,
  );
  const set = useCallback((v: string | null) => safeStorage().setItem(key, v ?? ""), [key]);
  return [value || null, set];
}

export const useCurrentProjectId = () => useStoredValue("fd.currentProject");
