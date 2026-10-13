"use client";
import { MemoryStore, type KeyValueStore } from "@/integration/demo/browser-projects";

let fallback: MemoryStore | null = null;

/** localStorage that never throws (private mode, blocked storage, SSR). */
export function safeStorage(): KeyValueStore {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const k = "__fd_probe";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return {
        getItem: (key) => {
          try {
            return window.localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            window.localStorage.setItem(key, value);
            window.dispatchEvent(new CustomEvent("fd-storage", { detail: key }));
          } catch {
            /* quota exceeded or blocked: ignore, UI keeps state in memory */
          }
        },
      };
    }
  } catch {
    /* fall through */
  }
  fallback ??= new MemoryStore();
  return fallback;
}
