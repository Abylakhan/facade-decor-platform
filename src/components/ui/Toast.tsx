"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./icons";

type Tone = "ok" | "info" | "warn" | "danger";
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: Tone = "ok") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-3), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === "danger" ? 7000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed right-4 bottom-4 left-4 z-[200] flex flex-col items-end gap-2 sm:left-auto" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "danger" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-sm items-start gap-2 border px-4 py-3 text-sm shadow-[var(--shadow-lift)] animate-[toastIn_var(--duration-base)_var(--ease-arch)] ${
              t.tone === "danger" ? "border-danger/40 bg-danger-soft" : t.tone === "warn" ? "border-warn/40 bg-warn-soft" : "border-ink bg-ink text-white"
            }`}
          >
            <Icon name={t.tone === "ok" ? "check" : t.tone === "info" ? "info" : "warn"} size={16} className="mt-0.5 shrink-0" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
